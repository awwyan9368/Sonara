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
  const flowMeshRef = useRef<THREE.Mesh>(null);

  const particleCount = Math.floor(1800 * particleDensity);

  const [positions, initialPositions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const initPos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Helix / Ribbon distribution
      const u = (i / particleCount) * Math.PI * 12;
      const r = 8 + (i % 5) * 4;
      const x = Math.cos(u) * r + (Math.random() - 0.5) * 6;
      const y = (i / particleCount) * 40 - 20 + (Math.random() - 0.5) * 4;
      const z = Math.sin(u) * r + (Math.random() - 0.5) * 6;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      initPos[i * 3] = x;
      initPos[i * 3 + 1] = y;
      initPos[i * 3 + 2] = z;

      col[i * 3] = 0.8; // Violet / Magenta bias
      col[i * 3 + 1] = 0.3;
      col[i * 3 + 2] = 0.9;
    }

    return [pos, initPos, col];
  }, [particleCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    if (pointsRef.current && !reducedMotion) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        // Organic harmonic wave deformation driven by mid and bass energy
        const wave = Math.sin(time * 1.5 + initialPositions[iy] * 0.2) * (1.5 + metrics.mid * 4);
        posAttr.array[ix] = initialPositions[ix] + Math.cos(time + i) * wave * 0.3;
        posAttr.array[iz] = initialPositions[iz] + Math.sin(time + i) * wave * 0.3;

        // Dynamic color shifting based on audio energy
        colAttr.array[ix] = 0.5 + metrics.bass * 0.5;
        colAttr.array[iy] = 0.2 + metrics.treble * 0.7;
        colAttr.array[iz] = 0.8 + metrics.mid * 0.2;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      pointsRef.current.rotation.y += delta * (0.1 + metrics.overallEnergy * 0.3);
    }

    if (flowMeshRef.current && !reducedMotion) {
      flowMeshRef.current.rotation.y -= delta * 0.15;
      const s = 1.0 + metrics.bass * 0.4;
      flowMeshRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group name="nebula-flow-preset">
      {/* Central Volumetric Flow Torus */}
      <mesh ref={flowMeshRef}>
        <torusKnotGeometry args={[9, 2.5, 64, 16]} />
        <meshStandardMaterial
          color="#8C6CFF"
          emissive="#64DFFF"
          emissiveIntensity={0.6}
          roughness={0.4}
          metalness={0.6}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Ribbon Particle Cloud */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.6}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

