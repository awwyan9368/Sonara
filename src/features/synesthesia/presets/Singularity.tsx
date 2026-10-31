'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getStarParticleTexture, getEnergySparkTexture } from '../../universe/shaders/particleTextures';

interface SingularityProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

/**
 * PRESET 4 — SINGULARITY (Reference E)
 * Minimal black-hole singularity in a pure vertical composition.
 * - Dark central event horizon void.
 * - Elegant, razor-sharp golden Einstein ring with gravitational lensing curvature.
 * - Vertically flowing stream of starlight and accretion particles.
 * - Extreme contrast, deep negative space, and controlled cinematic bloom.
 */
export function Singularity({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: SingularityProps) {
  const eventHorizonRef = useRef<THREE.Mesh>(null);
  const einsteinRingRef = useRef<THREE.Mesh>(null);
  const lensingArcRef = useRef<THREE.Mesh>(null);
  const verticalStreamRef = useRef<THREE.Points>(null);

  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const sparkTexture = useMemo(() => getEnergySparkTexture(), []);

  const streamCount = Math.floor(2500 * particleDensity);

  // 1. Vertically Flowing Starlight Particle Stream across the Singularity
  const { streamPositions, streamOrigPos, streamColors, streamSpeeds } = useMemo(() => {
    const pos = new Float32Array(streamCount * 3);
    const orig = new Float32Array(streamCount * 3);
    const col = new Float32Array(streamCount * 3);
    const speeds = new Float32Array(streamCount);

    const cGold = new THREE.Color('#FFD573');
    const cWhite = new THREE.Color('#FFFFFF');
    const cAmber = new THREE.Color('#FFAA42');
    const cBlueIce = new THREE.Color('#94D6FF');

    for (let i = 0; i < streamCount; i++) {
      const i3 = i * 3;
      const yNorm = (i / streamCount);
      const y = (yNorm - 0.5) * 60.0;

      // Close narrow vertical stream column passing in front and behind the black hole
      const streamRadius = 0.4 + Math.pow(Math.abs(y / 30.0), 1.4) * 5.5;
      const angle = (Math.random() - 0.5) * Math.PI * 0.85; // biased toward X-axis alignment

      // Gravitational lensing deflection near the event horizon (y ~ 0)
      const distToCore = Math.sqrt(y * y + 0.1);
      const deflection = Math.exp(-Math.pow(y / 7.0, 2.0)) * 2.2;

      const x = Math.sin(angle) * (streamRadius + deflection) + (Math.random() - 0.5) * 0.8;
      const z = (Math.random() - 0.5) * 1.5;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      orig[i3] = x;
      orig[i3 + 1] = y;
      orig[i3 + 2] = z;

      speeds[i] = 14.0 + Math.random() * 20.0;

      // Palette matching Reference E
      const isGolden = Math.random() < 0.65;
      const c = isGolden
        ? (Math.random() < 0.5 ? cGold : cAmber)
        : (Math.random() < 0.5 ? cWhite : cBlueIce);

      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;
    }

    return {
      streamPositions: pos,
      streamOrigPos: orig,
      streamColors: col,
      streamSpeeds: speeds,
    };
  }, [streamCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Animate Vertical Particle Stream
    if (verticalStreamRef.current) {
      const posAttr = verticalStreamRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = streamCount;
      const flowSpeed = 1.0 + metrics.bass * 1.8 + metrics.transient * 2.5;

      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) + streamSpeeds[i] * delta * flowSpeed * 0.5;
        if (y > 30.0) y -= 60.0;

        const deflection = Math.exp(-Math.pow(y / 7.0, 2.0)) * (2.2 + metrics.subBass * 0.8);
        const ox = streamOrigPos[i * 3];
        const dir = ox >= 0 ? 1 : -1;

        posAttr.setXYZ(i, ox + dir * deflection * 0.4, y, streamOrigPos[i * 3 + 2]);
      }
      posAttr.needsUpdate = true;
    }

    // 2. Pulse the razor-sharp golden Einstein Ring
    if (einsteinRingRef.current) {
      const ringScale = 1.0 + metrics.subBass * 0.15 + metrics.transient * 0.2;
      einsteinRingRef.current.scale.set(ringScale, ringScale, 1.0);
    }

    // 3. Gravitational Lensing Arc Breathing
    if (lensingArcRef.current) {
      const arcScale = 1.0 + metrics.bass * 0.22;
      lensingArcRef.current.scale.set(arcScale, arcScale * 1.02, 1.0);
    }
  });

  return (
    <group name="singularity-preset" position={[0, 0, 0]}>
      {/* 1. Pure Black Schwarzschild Event Horizon Sphere */}
      <mesh ref={eventHorizonRef} position={[0, 0, 0]}>
        <sphereGeometry args={[4.4, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 2. Thin Razor-Sharp Golden Einstein Ring (Reference E) */}
      <mesh ref={einsteinRingRef} position={[0, 0, 0.05]}>
        <ringGeometry args={[4.45, 4.75, 128]} />
        <meshBasicMaterial
          color="#FFDF78"
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Relativistic Gravitational Lensing Outer Arc (Curving Back Behind Event Horizon) */}
      <mesh ref={lensingArcRef} position={[0.4, 0, -0.1]} rotation={[0, 0, Math.PI * 0.5]}>
        <ringGeometry args={[4.8, 5.5, 128, 1, 0, Math.PI]} />
        <meshBasicMaterial
          color="#FFAA38"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Secondary Soft Gravitational Glow */}
      <mesh position={[0, 0, -0.2]}>
        <ringGeometry args={[4.45, 7.2, 96]} />
        <meshBasicMaterial
          color="#FFB347"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 5. Pure Vertical Stream of Infalling & Escaping Starlight (Reference E) */}
      <points ref={verticalStreamRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[streamPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[streamColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          size={1.5}
          vertexColors
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* 6. High-Energy Central Core Flash on the Singular Boundary */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial
          map={sparkTexture}
          color="#FFFFFF"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

