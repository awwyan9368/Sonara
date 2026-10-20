'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

interface NebulaFlowProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

export function NebulaFlow({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: NebulaFlowProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const cloud1Ref = useRef<THREE.Mesh>(null);
  const cloud2Ref = useRef<THREE.Mesh>(null);

  const particleCount = Math.floor(2600 * particleDensity);

  // 3D Double-Helix / Volumetric Ribbon Filament Particle Field
  const { positions, initialPositions, colors, phases } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const initPos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Multi-arm logarithmic curl field
      const arm = i % 4;
      const t = (i / particleCount) * Math.PI * 14;
      const r = 4 + Math.pow(i / particleCount, 0.7) * 28;
      const armOffset = (arm / 4) * Math.PI * 2;

      const x = Math.cos(t + armOffset) * r + (Math.random() - 0.5) * 5;
      const y = (i / particleCount) * 50 - 25 + (Math.random() - 0.5) * 6;
      const z = Math.sin(t + armOffset) * r + (Math.random() - 0.5) * 5;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      initPos[i3] = x;
      initPos[i3 + 1] = y;
      initPos[i3 + 2] = z;

      // Color gradient: deep violet -> cyan -> electric magenta -> warm gold
      const c = (i / particleCount);
      if (c < 0.35) {
        col[i3] = 0.55; col[i3 + 1] = 0.42; col[i3 + 2] = 1.0; // Violet
      } else if (c < 0.7) {
        col[i3] = 0.39; col[i3 + 1] = 0.87; col[i3 + 2] = 1.0; // Cyan
      } else if (c < 0.9) {
        col[i3] = 0.88; col[i3 + 1] = 0.48; col[i3 + 2] = 1.0; // Magenta
      } else {
        col[i3] = 0.95; col[i3 + 1] = 0.75; col[i3 + 2] = 0.45; // Gold
      }

      ph[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, initialPositions: initPos, colors: col, phases: ph };
  }, [particleCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    if (pointsRef.current && !reducedMotion) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;

      const flowSpeed = 1.2 + metrics.bass * 2.5;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const phase = phases[i];

        // 3D Curl-noise simulation: wave displacement driven by Mid & LowMid
        const waveY = Math.sin(time * flowSpeed + initialPositions[i3 + 1] * 0.15 + phase);
        const waveX = Math.cos(time * flowSpeed * 0.8 + initialPositions[i3] * 0.12 + phase);

        const displacement = 1.0 + metrics.mid * 3.5 + metrics.transient * 2.0;

        posAttr.array[i3] = initialPositions[i3] + waveX * displacement;
        posAttr.array[i3 + 1] = initialPositions[i3 + 1] + waveY * displacement * 0.6;
        posAttr.array[i3 + 2] = initialPositions[i3 + 2] + Math.sin(time + phase) * displacement;

        // Dynamic frequency-driven color evolution
        colAttr.array[i3] = Math.min(1.0, colors[i3] + metrics.bass * 0.4);
        colAttr.array[i3 + 1] = Math.min(1.0, colors[i3 + 1] + metrics.treble * 0.5);
        colAttr.array[i3 + 2] = Math.min(1.0, colors[i3 + 2] + metrics.highMid * 0.3);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      pointsRef.current.rotation.y += delta * (0.12 + metrics.subBass * 0.3);
    }

    // Inner Volumetric Torus Clouds
    if (cloud1Ref.current && !reducedMotion) {
      cloud1Ref.current.rotation.y -= delta * (0.2 + metrics.mid * 0.4);
      cloud1Ref.current.rotation.x += delta * 0.1;
      const s1 = 1.0 + metrics.subBass * 0.6;
      cloud1Ref.current.scale.set(s1, s1, s1);
    }

    if (cloud2Ref.current && !reducedMotion) {
      cloud2Ref.current.rotation.y += delta * 0.18;
      cloud2Ref.current.rotation.z -= delta * 0.12;
      const s2 = 1.0 + metrics.bass * 0.5;
      cloud2Ref.current.scale.set(s2, s2, s2);
    }
  });

  return (
    <group name="nebula-flow-master">
      {/* Primary Organic Flow Torus Mesh */}
      <mesh ref={cloud1Ref}>
        <torusKnotGeometry args={[11, 3.2, 80, 20]} />
        <meshStandardMaterial
          color="#8C6CFF"
          emissive="#64DFFF"
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.7}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Secondary Counter-Rotating Gaseous Cloud */}
      <mesh ref={cloud2Ref} rotation={[Math.PI / 4, 0, Math.PI / 3]}>
        <torusGeometry args={[16, 2.5, 32, 64]} />
        <meshBasicMaterial
          color="#E27BFF"
          wireframe
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Volumetric Nebula Filament Particle Cloud */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.8}
          vertexColors
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
