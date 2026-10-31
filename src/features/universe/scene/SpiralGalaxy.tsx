'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { TasteCluster } from '@/types';
import { getStarParticleTexture, getNebulaDustTexture, getCrossSpikeTexture } from '../shaders/particleTextures';

export type GalaxyMorphology = 'grand_design_spiral' | 'barred_spiral' | 'elliptical' | 'irregular_starburst';

interface SpiralGalaxyProps {
  cluster: TasteCluster;
  isSelected: boolean;
  onSelect: (clusterId: string) => void;
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
  reducedMotion?: boolean;
}

export function SpiralGalaxy({
  cluster,
  isSelected,
  onSelect,
  quality = 'high',
  reducedMotion = false,
}: SpiralGalaxyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const armsPointsRef = useRef<THREE.Points>(null);
  const dustPointsRef = useRef<THREE.Points>(null);

  // Scaled star count based on quality
  const starCount = useMemo(() => {
    switch (quality) {
      case 'ultra':
        return 2800;
      case 'high':
        return 1800;
      case 'balanced':
        return 1000;
      case 'performance':
        return 500;
    }
  }, [quality]);

  // Derive stable galaxy morphology
  const morphology: GalaxyMorphology = useMemo(() => {
    const hash = cluster.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const types: GalaxyMorphology[] = [
      'grand_design_spiral',
      'barred_spiral',
      'grand_design_spiral',
      'elliptical',
      'irregular_starburst',
    ];
    return types[hash % types.length];
  }, [cluster.id]);

  // Star textures
  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const coreDustTexture = useMemo(() => getNebulaDustTexture(), []);
  const spikeTexture = useMemo(() => getCrossSpikeTexture(), []);

  // Procedural Galaxy Generation
  const { starPositions, starColors, starSizes, dustPositions, dustColors, dustSizes } = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const sz = new Float32Array(starCount);

    const dustCount = Math.floor(starCount * 0.28);
    const dPos = new Float32Array(dustCount * 3);
    const dCol = new Float32Array(dustCount * 3);
    const dSz = new Float32Array(dustCount);

    const baseColor = new THREE.Color(cluster.color);
    const coreBulgeColor = new THREE.Color('#FFE8CC'); // Population II (Class G/K old stars)
    const armYoungColor = new THREE.Color('#A8E5FF'); // Population I (Hot OB blue giants)
    const armClusterColor = new THREE.Color(cluster.color);
    const hIIColor = new THREE.Color('#FF4081'); // Hydrogen-alpha star-forming knots

    const maxRadius = cluster.radius;

    let seed = cluster.id.charCodeAt(0) * 100 + cluster.id.charCodeAt(1);
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    let dustIdx = 0;

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      if (morphology === 'elliptical') {
        // De Vaucouleurs Profile: Spheroidal triaxial core, smoothly fading halo
        const rNorm = Math.pow(rnd(), 2.8);
        const r = rNorm * maxRadius * 0.95;
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);

        // Triaxial flattening
        pos[i3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i3 + 1] = r * Math.cos(phi) * 0.65;
        pos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.85;

        // Rich golden-amber/orange population II stars
        const c = coreBulgeColor.clone().lerp(baseColor, rnd() * 0.25);
        const fade = Math.max(0.15, 1.0 - (r / maxRadius) * 0.7);
        col[i3] = c.r * fade;
        col[i3 + 1] = c.g * fade;
        col[i3 + 2] = c.b * fade;
        sz[i] = 0.5 + rnd() * 0.9;
      } else if (morphology === 'irregular_starburst') {
        // Chaotic asymmetric clumps with brilliant HII knots
        const clump = Math.floor(rnd() * 4);
        const clumpOffsets = [
          [maxRadius * 0.25, 0, maxRadius * 0.15],
          [-maxRadius * 0.35, maxRadius * 0.1, -maxRadius * 0.2],
          [maxRadius * 0.1, -maxRadius * 0.15, -maxRadius * 0.3],
          [0, 0, 0],
        ];
        const [cx, cy, cz] = clumpOffsets[clump];
        const r = Math.pow(rnd(), 1.5) * (maxRadius * 0.35);
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);

        pos[i3] = cx + r * Math.sin(phi) * Math.cos(theta);
        pos[i3 + 1] = cy + r * Math.cos(phi) * 0.45;
        pos[i3 + 2] = cz + r * Math.sin(phi) * Math.sin(theta);

        const isHII = rnd() < 0.25;
        const c = isHII ? hIIColor : baseColor.clone().lerp(armYoungColor, rnd() * 0.6);
        col[i3] = c.r;
        col[i3 + 1] = c.g;
        col[i3 + 2] = c.b;
        sz[i] = isHII ? 0.9 + rnd() * 1.3 : 0.5 + rnd() * 0.8;
      } else {
        // Spiral Galaxies: Grand-Design or Barred Spiral
        const isBarred = morphology === 'barred_spiral';
        const isCore = rnd() < (isBarred ? 0.26 : 0.20);

        if (isCore) {
          if (isBarred && rnd() < 0.6) {
            // Central Stellar Bar (-barLength to +barLength along X)
            const barLen = maxRadius * 0.38;
            const barT = (rnd() * 2 - 1) * barLen;
            const barWidth = (1.0 - Math.abs(barT / barLen)) * (maxRadius * 0.08);

            pos[i3] = barT;
            pos[i3 + 1] = (rnd() - 0.5) * 2.0;
            pos[i3 + 2] = (rnd() - 0.5) * barWidth;

            const c = coreBulgeColor.clone().lerp(baseColor, 0.2);
            col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
            sz[i] = 0.6 + rnd() * 0.9;
          } else {
            // Spheroidal Core Bulge
            const r = Math.pow(rnd(), 2.2) * (maxRadius * 0.22);
            const theta = rnd() * Math.PI * 2;
            const phi = Math.acos(2 * rnd() - 1);

            pos[i3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i3 + 1] = r * Math.cos(phi) * 0.35;
            pos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

            const c = coreBulgeColor.clone().lerp(baseColor, 0.25);
            col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
            sz[i] = 0.5 + rnd() * 0.9;
          }
        } else {
          // Logarithmic spiral arms
          const arms = 2;
          const armIndex = i % arms;
          const armOffset = (armIndex / arms) * Math.PI * 2;

          const rNorm = Math.pow(rnd(), 1.15);
          const r = (maxRadius * 0.2) + rNorm * (maxRadius * 0.8);

          // Winding logarithmic pitch angle: theta = ln(r/r0) / tan(pitch)
          const pitchAngle = isBarred ? 3.2 : 2.7;
          const theta = Math.log(r / (maxRadius * 0.2)) * pitchAngle + armOffset;

          const dispersion = 0.5 + (r / maxRadius) * 2.8;
          const jitter = (rnd() + rnd() - 1.0) * dispersion;
          const verticalJitter = (rnd() + rnd() - 1.0) * (dispersion * 0.22);

          pos[i3] = Math.cos(theta) * r + Math.sin(theta) * jitter;
          pos[i3 + 1] = verticalJitter;
          pos[i3 + 2] = Math.sin(theta) * r - Math.cos(theta) * jitter;

          // Stellar population along arms: young OB blue stars + HII starburst pockets
          const t = r / maxRadius;
          const isHII = rnd() < 0.12;
          const starCol = isHII
            ? hIIColor
            : baseColor.clone().lerp(armYoungColor, rnd() * 0.7).lerp(armClusterColor, t * 0.4);

          const fade = Math.max(0.25, 1.0 - t * 0.55);
          col[i3] = starCol.r * fade;
          col[i3 + 1] = starCol.g * fade;
          col[i3 + 2] = starCol.b * fade;
          sz[i] = isHII ? 0.9 + rnd() * 1.1 : 0.5 + rnd() * 1.0;

          // Populate Interstellar Dust Absorption Lane on inner edge of arm
          if (dustIdx < dustCount && rnd() < 0.45) {
            const d3 = dustIdx * 3;
            // Slightly offset to inner edge of spiral arm
            const dustR = r * 0.96;
            const dustTheta = theta - 0.12;
            dPos[d3] = Math.cos(dustTheta) * dustR + Math.sin(dustTheta) * (jitter * 0.7);
            dPos[d3 + 1] = verticalJitter * 0.6;
            dPos[d3 + 2] = Math.sin(dustTheta) * dustR - Math.cos(dustTheta) * (jitter * 0.7);

            // Dark interstellar molecular soot
            dCol[d3] = 0.05;
            dCol[d3 + 1] = 0.03;
            dCol[d3 + 2] = 0.08;
            dSz[dustIdx] = 2.4 + rnd() * 2.8;
            dustIdx++;
          }
        }
      }
    }

    return {
      starPositions: pos,
      starColors: col,
      starSizes: sz,
      dustPositions: dPos.slice(0, dustIdx * 3),
      dustColors: dCol.slice(0, dustIdx * 3),
      dustSizes: dSz.slice(0, dustIdx),
    };
  }, [cluster, starCount, morphology]);

  // Slow astronomical rotation (subtle, non-fan)
  useFrame((_, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.018;
    }
  });

  const coreRadius = Math.max(2.5, cluster.radius * 0.16);

  return (
    <group position={cluster.center}>
      <group ref={groupRef}>
        {/* Soft Gaseous Galactic Bulge (Billboard camera-facing to avoid slicing 3D systems) */}
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <mesh ref={coreRef}>
            <planeGeometry args={[coreRadius * 4.2, coreRadius * 4.2]} />
            <meshBasicMaterial
              map={coreDustTexture}
              color={cluster.color}
              transparent
              opacity={isSelected ? 0.35 : 0.04}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Central Stellar Singularity Glow */}
          <mesh>
            <planeGeometry args={[coreRadius * 1.6, coreRadius * 1.6]} />
            <meshBasicMaterial
              map={starTexture}
              color="#FFF4E0"
              transparent
              opacity={isSelected ? 0.45 : 0.06}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Astrophotography 4-Point Cross Diffraction Core Spike */}
          {isSelected && (
            <mesh>
              <planeGeometry args={[coreRadius * 4.2, coreRadius * 4.2]} />
              <meshBasicMaterial
                map={spikeTexture}
                color="#FFFFFF"
                transparent
                opacity={0.8}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </Billboard>

        {/* Spiral Arm Star Populations (Soft Point Sprites with Additive Blending) */}
        <points ref={armsPointsRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[starColors, 3]} />
            <bufferAttribute attach="attributes-size" args={[starSizes, 1]} />
          </bufferGeometry>
          <pointsMaterial
            map={starTexture}
            size={1.5}
            vertexColors
            transparent
            opacity={isSelected ? 0.95 : 0.8}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Interstellar Dust Extinction Lanes (Normal Blending for physical light absorption) */}
        {dustPositions.length > 0 && (
          <points ref={dustPointsRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
              <bufferAttribute attach="attributes-color" args={[dustColors, 3]} />
              <bufferAttribute attach="attributes-size" args={[dustSizes, 1]} />
            </bufferGeometry>
            <pointsMaterial
              map={coreDustTexture}
              size={2.6}
              vertexColors
              transparent
              opacity={0.7}
              sizeAttenuation
              blending={THREE.NormalBlending}
              depthWrite={false}
            />
          </points>
        )}

        {/* Outer Orbit Resonance Ring (Faint Celestial Guide) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[cluster.radius * 0.995, cluster.radius * 1.005, 96]} />
          <meshBasicMaterial
            color={cluster.color}
            transparent
            opacity={isSelected ? 0.35 : 0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Floating Interactive Galactic Label */}
      <Html
        position={[0, cluster.radius * 0.85, 0]}
        center
        distanceFactor={110}
        zIndexRange={[80, 0]}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(cluster.id);
          }}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer select-none ${
            isSelected
              ? 'bg-surface-raised/95 border-accent-cyan shadow-[0_0_20px_rgba(100,223,255,0.5)] text-text-primary scale-105'
              : 'bg-surface/70 border-border-subtle hover:border-text-secondary text-text-secondary hover:text-text-primary hover:scale-105'
          }`}
          aria-label={`Select galaxy ${cluster.label}`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
            style={{ backgroundColor: cluster.color, boxShadow: `0 0 10px ${cluster.color}` }}
          />
          <span className="text-xs font-semibold tracking-wide uppercase font-mono">
            {cluster.label}
          </span>
          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-full bg-surface-raised border border-border-subtle font-mono">
            {cluster.memberArtistIds?.length || 0} Stars
          </span>
        </button>
      </Html>
    </group>
  );
}
