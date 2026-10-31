'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { TasteCluster } from '@/types';
import { getNebulaDustTexture } from '../shaders/particleTextures';

export type NebulaArchetype = 'emission' | 'reflection' | 'diffuse_dark';

interface VolumetricNebulaeProps {
  clusters: TasteCluster[];
  selectedClusterId: string | null;
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
  reducedMotion?: boolean;
}

/**
 * Procedural Volumetric Nebula Cloud Texture Generator
 * Uses multiscale fractal noise and domain warping to create organic filaments,
 * gas cavities, and dark extinction pockets without repeating patterns.
 */
function createProceduralNebulaTexture(
  archetype: NebulaArchetype,
  seed: number,
  baseColorHex: string,
  resolution = 256
): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const baseCol = new THREE.Color(baseColorHex);

  const pseudoRandom = (x: number, y: number) => {
    const val = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return val - Math.floor(val);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = pseudoRandom(i, j);
    const n10 = pseudoRandom(i + 1, j);
    const n01 = pseudoRandom(i, j + 1);
    const n11 = pseudoRandom(i + 1, j + 1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    return nx0 * (1 - sy) + nx1 * sy;
  };

  const fbm = (px: number, py: number) => {
    return (
      smoothNoise(px, py) * 0.5 +
      smoothNoise(px * 2.0, py * 2.0) * 0.25 +
      smoothNoise(px * 4.0, py * 4.0) * 0.15 +
      smoothNoise(px * 8.0, py * 8.0) * 0.1
    );
  };

  const imgData = ctx.createImageData(resolution, resolution);
  const data = imgData.data;

  const center = resolution / 2;
  const maxRadius = resolution * 0.48;

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const idx = (y * resolution + x) * 4;
      const dx = (x - center) / maxRadius;
      const dy = (y - center) / maxRadius;
      const distFromCenter = Math.hypot(dx, dy);

      // Radial envelope: smooth quadratic edge falloff
      const radialMask = Math.max(0, 1.0 - distFromCenter);
      const edgeFalloff = radialMask * radialMask;

      if (edgeFalloff <= 0.001) {
        data[idx + 3] = 0;
        continue;
      }

      // Domain-warped multiscale noise coordinates
      const u = (x / resolution) * 5.0;
      const v = (y / resolution) * 5.0;
      const warpX = fbm(u * 0.7, v * 0.7);
      const warpY = fbm(u * 0.7 + 4.3, v * 0.7 + 2.1);
      const density = fbm(u + warpX * 1.5, v + warpY * 1.5);

      // Internal dark absorption cavities
      const cavity = fbm(u * 1.8 + 10.0, v * 1.8 + 10.0);
      const gasDensity = Math.max(0, density - (cavity > 0.65 ? (cavity - 0.65) * 2.0 : 0));

      const alpha = Math.min(1.0, gasDensity * edgeFalloff * 1.8);

      if (archetype === 'emission') {
        // H-Alpha Red/Magenta emission with warm gold knots
        const knot = Math.pow(gasDensity, 2.5);
        data[idx] = Math.floor(Math.min(255, (baseCol.r * 220 + knot * 255) * 1.1));
        data[idx + 1] = Math.floor(Math.min(255, baseCol.g * 110 + knot * 160));
        data[idx + 2] = Math.floor(Math.min(255, baseCol.b * 190 + knot * 80));
      } else if (archetype === 'reflection') {
        // Cool ethereal cyan/blue reflection with delicate dust gradients
        data[idx] = Math.floor(baseCol.r * 120 + gasDensity * 90);
        data[idx + 1] = Math.floor(baseCol.g * 200 + gasDensity * 55);
        data[idx + 2] = Math.floor(baseCol.b * 255);
      } else {
        // Diffuse interstellar dust with subtle dark extinction
        data[idx] = Math.floor(baseCol.r * 160);
        data[idx + 1] = Math.floor(baseCol.g * 140);
        data[idx + 2] = Math.floor(baseCol.b * 220);
      }

      data[idx + 3] = Math.floor(alpha * 240);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Renders deep, layered, organic interstellar nebulae across cosmic coordinates.
 */
export function VolumetricNebulae({
  clusters,
  selectedClusterId,
  quality = 'high',
  reducedMotion = false,
}: VolumetricNebulaeProps) {
  const nebulaeGroupsRef = useRef<THREE.Group>(null);

  // Generate procedural textures once per cluster archetype
  const nebulaData = useMemo(() => {
    return clusters.map((cluster, idx) => {
      const archetypes: NebulaArchetype[] = ['emission', 'reflection', 'diffuse_dark'];
      const archetype = archetypes[idx % archetypes.length];
      const seed = cluster.id.charCodeAt(0) * 17 + idx * 31;
      const texture = createProceduralNebulaTexture(archetype, seed, cluster.color, 256);

      // Multiple layered depth planes oriented at slight angles
      const planeCount = quality === 'ultra' ? 4 : quality === 'high' ? 3 : 2;
      const planes = [];
      const baseSpan = cluster.radius * 2.2;

      for (let p = 0; p < planeCount; p++) {
        const offsetZ = (p - (planeCount - 1) / 2) * (cluster.radius * 0.35);
        const rotZ = (p * 0.45) + (idx * 0.6);
        const scale = 1.0 + (p * 0.2);
        planes.push({ offsetZ, rotZ, scale });
      }

      return {
        cluster,
        archetype,
        texture,
        baseSpan,
        planes,
      };
    });
  }, [clusters, quality]);

  useFrame((_, delta) => {
    if (!reducedMotion && nebulaeGroupsRef.current) {
      nebulaeGroupsRef.current.children.forEach((group, idx) => {
        const speed = 0.008 + (idx % 3) * 0.004;
        group.rotation.y += delta * speed;
      });
    }
  });

  return (
    <group ref={nebulaeGroupsRef} name="volumetric-cosmic-nebulae">
      {nebulaData.map(({ cluster, texture, baseSpan, planes }) => {
        const isSelected = selectedClusterId === cluster.id;

        return (
          <group key={cluster.id} position={cluster.center}>
            {planes.map((pl, pIdx) => (
              <Billboard
                key={pIdx}
                follow
                lockX={false}
                lockY={false}
                lockZ={false}
                position={[0, (pIdx - 1) * 3.5, pl.offsetZ * 0.4]}
              >
                <mesh scale={[pl.scale, pl.scale, pl.scale]}>
                  <planeGeometry args={[baseSpan * 0.65, baseSpan * 0.65]} />
                  <meshBasicMaterial
                    map={texture}
                    color={cluster.color}
                    transparent
                    opacity={isSelected ? 0.22 : 0.035}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </Billboard>
            ))}
          </group>
        );
      })}
    </group>
  );
}

