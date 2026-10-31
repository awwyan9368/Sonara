'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getNebulaDustTexture, getStarParticleTexture, getEnergySparkTexture } from '../../universe/shaders/particleTextures';

interface NebulaFlowProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

/**
 * PRESET 1 — NEBULA FLOW: Fluid Cosmic Environment
 * A sweeping, multi-tiered volumetric interstellar cloud installation.
 * - Deep celestial background with multi-spectral stellar populations.
 * - Volumetric multi-plane gas canopies with dark molecular rifts and HII knots.
 * - Organic 3D particle stream driven by curl-noise velocity vectors.
 * - Audio: Sub-bass billows cloud volumes; Mid frequencies alter magnetic flow lines;
 *   Treble stimulates fine turbulence; Transients emit radiant ionization shockwaves.
 */
export function NebulaFlow({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: NebulaFlowProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const cloudLayer1Ref = useRef<THREE.Mesh>(null);
  const cloudLayer2Ref = useRef<THREE.Mesh>(null);
  const cloudLayer3Ref = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  const particleCount = Math.floor(2800 * particleDensity);

  const dustTexture = useMemo(() => getNebulaDustTexture(), []);
  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const sparkTexture = useMemo(() => getEnergySparkTexture(), []);

  // 3D Double-Helix / Volumetric Ribbon Streamline Field
  const { positions, initialPositions, colors, initialColors, phases, speeds } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const initPos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const initCol = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);
    const sp = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const arm = i % 4;
      const t = (i / particleCount) * Math.PI * 14;
      const r = 3 + Math.pow(i / particleCount, 0.65) * 32;
      const armOffset = (arm / 4) * Math.PI * 2;

      const x = Math.cos(t + armOffset) * r + (Math.random() - 0.5) * 6;
      const y = (i / particleCount) * 54 - 27 + (Math.random() - 0.5) * 6;
      const z = Math.sin(t + armOffset) * r + (Math.random() - 0.5) * 6;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      initPos[i3] = x;
      initPos[i3 + 1] = y;
      initPos[i3 + 2] = z;

      // Color gradient: deep violet -> electric cyan -> neon magenta -> warm gold
      const c = i / particleCount;
      if (c < 0.32) {
        col[i3] = 0.52; col[i3 + 1] = 0.38; col[i3 + 2] = 1.0; // Violet
      } else if (c < 0.68) {
        col[i3] = 0.22; col[i3 + 1] = 0.85; col[i3 + 2] = 1.0; // Electric Cyan
      } else if (c < 0.88) {
        col[i3] = 0.92; col[i3 + 1] = 0.32; col[i3 + 2] = 0.95; // Magenta
      } else {
        col[i3] = 0.98; col[i3 + 1] = 0.78; col[i3 + 2] = 0.42; // Warm Gold
      }

      initCol[i3] = col[i3];
      initCol[i3 + 1] = col[i3 + 1];
      initCol[i3 + 2] = col[i3 + 2];

      ph[i] = Math.random() * Math.PI * 2;
      sp[i] = 0.6 + Math.random() * 0.8;
    }

    return {
      positions: pos,
      initialPositions: initPos,
      colors: col,
      initialColors: initCol,
      phases: ph,
      speeds: sp,
    };
  }, [particleCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    if (pointsRef.current && !reducedMotion) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;

      const flowSpeed = 0.9 + metrics.bass * 1.5;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const phase = phases[i];
        const sp = speeds[i];

        // 3D Curl-flow harmonic streamlines
        const waveY = Math.sin(time * flowSpeed * sp + initialPositions[i3 + 1] * 0.08 + phase);
        const waveX = Math.cos(time * flowSpeed * sp * 0.8 + initialPositions[i3] * 0.07 + phase);
        const waveZ = Math.sin(time * flowSpeed * sp * 0.6 + initialPositions[i3 + 2] * 0.06 + phase);

        const displacement = 0.8 + metrics.mid * 1.8 + metrics.subBass * 1.0;

        posAttr.array[i3] = initialPositions[i3] + waveX * displacement;
        posAttr.array[i3 + 1] = initialPositions[i3 + 1] + waveY * displacement * 0.8;
        posAttr.array[i3 + 2] = initialPositions[i3 + 2] + waveZ * displacement;

        // Dynamic frequency-driven brightness from immutable initialColors
        const energyBoost = 0.85 + metrics.mid * 0.35 + metrics.transient * 0.25;
        colAttr.array[i3] = Math.min(1.0, initialColors[i3] * energyBoost);
        colAttr.array[i3 + 1] = Math.min(1.0, initialColors[i3 + 1] * energyBoost);
        colAttr.array[i3 + 2] = Math.min(1.0, initialColors[i3 + 2] * energyBoost);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      pointsRef.current.rotation.y += delta * (0.07 + metrics.subBass * 0.12);
    }

    // Volumetric cloud layer respiration
    if (cloudLayer1Ref.current && !reducedMotion) {
      cloudLayer1Ref.current.rotation.z -= delta * (0.08 + metrics.mid * 0.15);
      const s1 = 1.0 + metrics.subBass * 0.35;
      cloudLayer1Ref.current.scale.set(s1, s1, s1);
    }

    if (cloudLayer2Ref.current && !reducedMotion) {
      cloudLayer2Ref.current.rotation.z += delta * (0.06 + metrics.bass * 0.12);
      const s2 = 1.0 + metrics.bass * 0.3;
      cloudLayer2Ref.current.scale.set(s2, s2, s2);
    }

    if (cloudLayer3Ref.current && !reducedMotion) {
      cloudLayer3Ref.current.rotation.y += delta * 0.04;
      const s3 = 1.0 + metrics.lowMid * 0.25;
      cloudLayer3Ref.current.scale.set(s3, s3, s3);
    }

    // Luminous transient shockwave expansion
    if (shockwaveRef.current) {
      if (metrics.transient > 0.25) {
        const s = 1.0 + metrics.transient * 3.8;
        shockwaveRef.current.scale.set(s, s, s);
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = metrics.transient * 0.75;
      } else {
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity *= 0.88;
      }
    }
  });

  return (
    <group name="nebula-flow-environment">
      {/* Layer 1: Deep Background Gaseous Canopy (Violet / Indigo) */}
      <mesh ref={cloudLayer1Ref} position={[0, 0, -18]} rotation={[Math.PI / 2.3, 0.2, 0]}>
        <planeGeometry args={[56, 56]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#6C4AFF"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Layer 2: Midground Cyan / Turquoise Gas Veil */}
      <mesh ref={cloudLayer2Ref} position={[0, 2, -6]} rotation={[Math.PI / 1.8, -0.25, Math.PI / 4]}>
        <planeGeometry args={[46, 46]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#38D7FF"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Layer 3: Foreground Radiant Magenta Filament Cloud */}
      <mesh ref={cloudLayer3Ref} position={[0, -2, 4]} rotation={[Math.PI / 2.1, 0.3, -0.4]}>
        <planeGeometry args={[38, 38]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#E248C8"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Transient Ionization Shockwave Ring */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 16.5, 64]} />
        <meshBasicMaterial
          map={sparkTexture}
          color="#64DFFF"
          transparent
          opacity={0.0}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Volumetric Streamline Dust & Motes (Smooth Sprites) */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={dustTexture}
          size={3.0}
          vertexColors
          transparent
          opacity={0.82}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
