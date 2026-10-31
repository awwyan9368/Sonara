'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getNebulaDustTexture, getStarParticleTexture } from '../../universe/shaders/particleTextures';

interface EtherealNebulaProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

/**
 * PRESET 1 — ETHEREAL NEBULA (Reference A)
 * Organic, translucent cosmic smoke and silk-like flowing structures.
 * Nuanced color transitions: warm amber, glowing copper, ivory/cream, turquoise, cyan, and deep violet.
 * Embedded micro-stardust particles and deep black negative space.
 */
export function EtherealNebula({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: EtherealNebulaProps) {
  const ribbonMeshRef = useRef<THREE.Mesh>(null);
  const stardustRef = useRef<THREE.Points>(null);
  const cloudVeilRef = useRef<THREE.Mesh>(null);

  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const dustTexture = useMemo(() => getNebulaDustTexture(), []);

  // 1. Organic Parametric Silk-Ribbon Surface (Translucent Smoke Veils)
  const { ribbonGeo, originalPositions, ribbonColors } = useMemo(() => {
    const uSegs = 140;
    const vSegs = 24;
    const geo = new THREE.PlaneGeometry(36, 48, uSegs, vSegs);
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const count = posAttr.count;
    const origPos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    // Color Palette from Reference A:
    const colAmber = new THREE.Color('#FF9E42');
    const colCopper = new THREE.Color('#E27D60');
    const colIvory = new THREE.Color('#FFF5EB');
    const colTurquoise = new THREE.Color('#41B3A3');
    const colCyan = new THREE.Color('#34E89E');
    const colViolet = new THREE.Color('#7918F2');
    const colShadow = new THREE.Color('#2C1654');

    for (let j = 0; j <= vSegs; j++) {
      const v = j / vSegs; // 0 (bottom) to 1 (top)
      for (let i = 0; i <= uSegs; i++) {
        const u = i / uSegs; // 0 to 1
        const idx = j * (uSegs + 1) + i;
        const i3 = idx * 3;

        // Base serpentine flowing veil curvature
        const angle = u * Math.PI * 3.5;
        const widthTaper = Math.sin(v * Math.PI) * (14.0 + Math.sin(u * 5.0) * 4.0);
        const x = Math.sin(angle) * widthTaper * 0.8 + (u - 0.5) * 8.0;
        const y = (v - 0.5) * 46.0;
        const z = Math.cos(angle) * (6.0 + Math.sin(v * 4.0) * 4.5);

        posAttr.setXYZ(idx, x, y, z);
        origPos[i3] = x;
        origPos[i3 + 1] = y;
        origPos[i3 + 2] = z;

        // Multi-chromatic Silk Gradient
        let c: THREE.Color;
        if (v < 0.25) {
          c = colShadow.clone().lerp(colViolet, v / 0.25);
        } else if (v < 0.5) {
          const t = (v - 0.25) / 0.25;
          c = colViolet.clone().lerp(colTurquoise, t).lerp(colCyan, Math.sin(u * Math.PI) * 0.4);
        } else if (v < 0.75) {
          const t = (v - 0.5) / 0.25;
          c = colCyan.clone().lerp(colIvory, t * 0.6).lerp(colAmber, t);
        } else {
          const t = (v - 0.75) / 0.25;
          c = colAmber.clone().lerp(colCopper, t).lerp(colIvory, Math.sin(u * Math.PI * 2.0) * 0.3);
        }

        cols[i3] = c.r;
        cols[i3 + 1] = c.g;
        cols[i3 + 2] = c.b;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    return { ribbonGeo: geo, originalPositions: origPos, ribbonColors: cols };
  }, []);

  // 2. Embedded Micro-Stardust Particles glittering within the folds
  const stardustCount = Math.floor(2200 * particleDensity);
  const { stardustPositions, stardustOrigPos, stardustColors, stardustPhases } = useMemo(() => {
    const pos = new Float32Array(stardustCount * 3);
    const orig = new Float32Array(stardustCount * 3);
    const cols = new Float32Array(stardustCount * 3);
    const phases = new Float32Array(stardustCount);

    const cIvory = new THREE.Color('#FFF8EE');
    const cAmber = new THREE.Color('#FFB067');
    const cTurquoise = new THREE.Color('#64DFFF');

    for (let i = 0; i < stardustCount; i++) {
      const i3 = i * 3;
      const v = Math.random();
      const u = Math.random();
      const angle = u * Math.PI * 3.5;
      const widthTaper = Math.sin(v * Math.PI) * (14.0 + Math.sin(u * 5.0) * 4.0);

      const x = Math.sin(angle) * widthTaper * 0.8 + (Math.random() - 0.5) * 5.0;
      const y = (v - 0.5) * 46.0 + (Math.random() - 0.5) * 4.0;
      const z = Math.cos(angle) * 7.0 + (Math.random() - 0.5) * 6.0;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      orig[i3] = x;
      orig[i3 + 1] = y;
      orig[i3 + 2] = z;

      const pick = Math.random();
      const c = pick < 0.4 ? cIvory : pick < 0.75 ? cAmber : cTurquoise;
      cols[i3] = c.r;
      cols[i3 + 1] = c.g;
      cols[i3 + 2] = c.b;

      phases[i] = Math.random() * Math.PI * 2;
    }

    return {
      stardustPositions: pos,
      stardustOrigPos: orig,
      stardustColors: cols,
      stardustPhases: phases,
    };
  }, [stardustCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Undulate the silk smoke veil surface
    if (ribbonMeshRef.current) {
      const posAttr = ribbonMeshRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = posAttr.count;
      const bassInfluence = metrics.bass * 2.2;
      const midInfluence = metrics.mid * 1.8;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const ox = originalPositions[i3];
        const oy = originalPositions[i3 + 1];
        const oz = originalPositions[i3 + 2];

        // Harmonic traveling curl wave
        const wave1 = Math.sin(oy * 0.12 - time * 1.5) * (1.2 + bassInfluence);
        const wave2 = Math.cos(ox * 0.15 + time * 2.0) * (0.8 + midInfluence);

        posAttr.setXYZ(
          i,
          ox + wave2 * 0.7,
          oy + Math.sin(time * 0.8 + ox * 0.1) * 0.4,
          oz + wave1 + wave2
        );
      }
      posAttr.needsUpdate = true;
      ribbonMeshRef.current.geometry.computeVertexNormals();

      if (!reducedMotion) {
        ribbonMeshRef.current.rotation.y = Math.sin(time * 0.15) * 0.18;
      }
    }

    // 2. Animate Stardust Shimmer
    if (stardustRef.current) {
      const posAttr = stardustRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = stardustCount;
      const trebleMod = 1.0 + metrics.treble * 2.5;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const ph = stardustPhases[i];
        const shimmer = Math.sin(time * 3.0 * stardustPhases[i] + ph) * 0.25 * trebleMod;

        posAttr.setXYZ(
          i,
          stardustOrigPos[i3] + shimmer,
          stardustOrigPos[i3 + 1] + Math.cos(time + ph) * 0.3,
          stardustOrigPos[i3 + 2] + shimmer
        );
      }
      posAttr.needsUpdate = true;

      if (!reducedMotion) {
        stardustRef.current.rotation.y = Math.sin(time * 0.15) * 0.18;
      }
    }

    // 3. Volumetric Veil Pulsing on Bass
    if (cloudVeilRef.current) {
      const s = 1.0 + metrics.bass * 0.12;
      cloudVeilRef.current.scale.set(s, s * 1.05, s);
    }
  });

  return (
    <group name="ethereal-nebula-preset">
      {/* 1. Translucent Silk Veil Ribbon Surface */}
      <mesh ref={ribbonMeshRef} geometry={ribbonGeo}>
        <meshPhysicalMaterial
          vertexColors
          transparent
          opacity={0.82}
          roughness={0.25}
          metalness={0.1}
          clearcoat={0.7}
          clearcoatRoughness={0.15}
          transmission={0.45}
          ior={1.25}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* 2. Soft Ambient Backing Veil for Deep Volumetric Smoke Illusion */}
      <mesh ref={cloudVeilRef} rotation={[0, 0, 0]}>
        <planeGeometry args={[42, 54]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#FFA26B"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Secondary Cyan/Violet Ionization Veil */}
      <mesh rotation={[0, Math.PI / 4, 0]} position={[0, -4, -6]}>
        <planeGeometry args={[38, 48]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#41B3A3"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Embedded Glittering Micro-Stardust */}
      <points ref={stardustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stardustPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[stardustColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          size={1.4}
          vertexColors
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

