'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getStarParticleTexture, getNebulaDustTexture } from '../../universe/shaders/particleTextures';

interface SpiralResonanceProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

/**
 * PRESET 2 — SPIRAL RESONANCE (Reference B)
 * Dense, crystalline astrophotography spiral galaxy.
 * Thousands of fine luminous stellar points with logarithmic density gradients,
 * a brilliant compact core, and dark extinction lanes between arms.
 * Expands, contracts, and dynamically twists with sound.
 */
export function SpiralResonance({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: SpiralResonanceProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);

  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const dustTexture = useMemo(() => getNebulaDustTexture(), []);

  const starCount = Math.floor(4500 * particleDensity);
  const dustCount = Math.floor(1200 * particleDensity);

  // Astrophotography Logarithmic Spiral Generation
  const { positions, origPositions, colors, radiuses, angles, dustPositions, dustOrigPositions } = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const orig = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const rads = new Float32Array(starCount);
    const angs = new Float32Array(starCount);

    const dPos = new Float32Array(dustCount * 3);
    const dOrig = new Float32Array(dustCount * 3);

    const maxRadius = 32.0;
    const arms = 2;
    const pitch = 0.28; // logarithmic spiral pitch

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const isCore = i < starCount * 0.22;

      let r: number;
      let theta: number;
      let verticalDispersion: number;

      if (isCore) {
        // High density de Vaucouleurs galactic core
        const u = Math.pow(Math.random(), 2.4);
        r = u * (maxRadius * 0.18);
        theta = Math.random() * Math.PI * 2;
        verticalDispersion = (Math.random() - 0.5) * (maxRadius * 0.08) * (1.0 - r / 6.0);
      } else {
        // Logarithmic Spiral Arms with Gaussian dispersion
        const armIndex = i % arms;
        const armOffset = (armIndex / arms) * Math.PI * 2;

        const normR = Math.pow(Math.random(), 1.2);
        r = maxRadius * 0.18 + normR * (maxRadius * 0.82);

        // theta = ln(r/r0) / tan(alpha)
        const spiralAngle = Math.log(r / (maxRadius * 0.18)) / pitch + armOffset;

        // Gaussian cross-arm scatter
        const scatter = (Math.random() + Math.random() - 1.0) * (0.8 + normR * 2.2);
        theta = spiralAngle + scatter / r;
        verticalDispersion = (Math.random() + Math.random() - 1.0) * (0.35 + normR * 0.8);
      }

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = verticalDispersion;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      orig[i3] = x;
      orig[i3 + 1] = y;
      orig[i3 + 2] = z;

      rads[i] = r;
      angs[i] = theta;

      // Photometric starlight color: Blinding silver-white with subtle warm core and ice-blue periphery
      const t = r / maxRadius;
      const brightness = 0.75 + Math.random() * 0.25;
      if (r < 5.0) {
        col[i3] = 1.0 * brightness;
        col[i3 + 1] = 0.96 * brightness;
        col[i3 + 2] = 0.90 * brightness;
      } else {
        const blueShift = Math.min(0.25, t * 0.3);
        col[i3] = (1.0 - blueShift * 0.5) * brightness;
        col[i3 + 1] = (1.0 - blueShift * 0.2) * brightness;
        col[i3 + 2] = 1.0 * brightness;
      }
    }

    // Interstellar Dust Extinction Lanes (silhouetted inner edges of arms)
    for (let d = 0; d < dustCount; d++) {
      const d3 = d * 3;
      const armIndex = d % arms;
      const armOffset = (armIndex / arms) * Math.PI * 2;
      const normR = Math.pow(Math.random(), 1.1);
      const r = maxRadius * 0.2 + normR * (maxRadius * 0.75);
      const spiralAngle = Math.log(r / (maxRadius * 0.18)) / pitch + armOffset - 0.14; // offset inward
      const scatter = (Math.random() - 0.5) * 1.2;

      const x = Math.cos(spiralAngle) * r + Math.sin(spiralAngle) * scatter;
      const z = Math.sin(spiralAngle) * r - Math.cos(spiralAngle) * scatter;
      const y = (Math.random() - 0.5) * 0.4;

      dPos[d3] = x;
      dPos[d3 + 1] = y;
      dPos[d3 + 2] = z;

      dOrig[d3] = x;
      dOrig[d3 + 1] = y;
      dOrig[d3 + 2] = z;
    }

    return {
      positions: pos,
      origPositions: orig,
      colors: col,
      radiuses: rads,
      angles: angs,
      dustPositions: dPos,
      dustOrigPositions: dOrig,
    };
  }, [starCount, dustCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Audio Modulation of Galactic Particles
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = starCount;

      const bassPulse = metrics.bass * 0.35;
      const midTwist = metrics.mid * 0.45;
      const transientShock = metrics.transient * 0.2;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const r = radiuses[i];
        const theta = angles[i];

        // Gravitational breathing: core dilates on bass, outer arms wave
        const breathing = 1.0 + (r < 7.0 ? bassPulse : -bassPulse * 0.12) + transientShock;
        const dynamicTheta = theta + (midTwist / (1.0 + r * 0.15)) + (time * 0.08);

        const currentR = r * breathing;
        posAttr.setXYZ(
          i,
          Math.cos(dynamicTheta) * currentR,
          origPositions[i3 + 1] + Math.sin(time * 2.0 + r * 0.2) * (0.2 + metrics.subBass * 0.5),
          Math.sin(dynamicTheta) * currentR
        );
      }
      posAttr.needsUpdate = true;
    }

    // 2. Rotate Dust Extinction Lanes in Lockstep
    if (dustRef.current) {
      const posAttr = dustRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = dustCount;
      const rot = time * 0.08 + metrics.mid * 0.2;

      for (let d = 0; d < count; d++) {
        const d3 = d * 3;
        const ox = dustOrigPositions[d3];
        const oz = dustOrigPositions[d3 + 2];
        const r = Math.sqrt(ox * ox + oz * oz);
        const theta = Math.atan2(oz, ox) + rot;

        posAttr.setXYZ(d, Math.cos(theta) * r, dustOrigPositions[d3 + 1], Math.sin(theta) * r);
      }
      posAttr.needsUpdate = true;
    }

    // 3. Central Luminous Nucleus Pulsing
    if (coreMeshRef.current) {
      const s = 1.0 + metrics.subBass * 0.45 + metrics.transient * 0.25;
      coreMeshRef.current.scale.set(s, s, s);
    }

    if (nucleusRef.current) {
      const s = 1.0 + metrics.bass * 0.6;
      nucleusRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group name="spiral-resonance-preset" rotation={[0.45, 0, 0]}>
      {/* 1. Blinding Compact Galactic Nucleus */}
      <mesh ref={nucleusRef} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.5, 7.5]} />
        <meshBasicMaterial
          map={starTexture}
          color="#FFFFFF"
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Soft Secondary Core Glow */}
      <mesh ref={coreMeshRef} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16.0, 16.0]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#FFF8E7"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Four-point Cross Diffraction Spikes on Galactic Nucleus */}
      <group>
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[26.0, 0.16]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[26.0, 0.16]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 4. Dense Crystalline Stellar Population (Reference B) */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          size={1.35}
          vertexColors
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* 5. Interstellar Dust Absorption Lanes (Physical Normal Blending) */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={dustTexture}
          color="#06060A"
          size={2.8}
          transparent
          opacity={0.78}
          blending={THREE.NormalBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
