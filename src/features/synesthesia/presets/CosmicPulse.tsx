'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

interface CosmicPulseProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

export function CosmicPulse({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: CosmicPulseProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particleCount = Math.floor(1200 * particleDensity);

  const [particlePositions, particleColors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 10 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      col[i * 3] = 0.4 + Math.random() * 0.6; // R
      col[i * 3 + 1] = 0.8 + Math.random() * 0.2; // G (Cyan bias)
      col[i * 3 + 2] = 1.0; // B
    }

    return [pos, col];
  }, [particleCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // Core reacts to Bass energy
    if (coreRef.current) {
      const targetScale = 1.0 + metrics.bass * 2.2;
      coreRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 15);
      if (!reducedMotion) {
        coreRef.current.rotation.y += delta * (0.4 + metrics.overallEnergy * 1.5);
      }
    }

    // Concentric expanding wavefront rings
    if (ring1Ref.current) {
      const s1 = 1.2 + ((time * 0.6 + metrics.bass * 0.5) % 2.5);
      ring1Ref.current.scale.set(s1, s1, s1);
      (ring1Ref.current.material as THREE.Material).opacity = Math.max(0, 1.0 - (s1 - 1.2) / 2.5);
    }

    if (ring2Ref.current) {
      const s2 = 1.2 + (((time * 0.6 + 0.8) + metrics.mid * 0.5) % 2.5);
      ring2Ref.current.scale.set(s2, s2, s2);
      (ring2Ref.current.material as THREE.Material).opacity = Math.max(0, 1.0 - (s2 - 1.2) / 2.5);
    }

    if (ring3Ref.current) {
      const s3 = 1.2 + (((time * 0.6 + 1.6) + metrics.treble * 0.5) % 2.5);
      ring3Ref.current.scale.set(s3, s3, s3);
      (ring3Ref.current.material as THREE.Material).opacity = Math.max(0, 1.0 - (s3 - 1.2) / 2.5);
    }

    // Sparkle particles react to Treble & Overall energy
    if (particlesRef.current && !reducedMotion) {
      particlesRef.current.rotation.y += delta * (0.05 + metrics.treble * 0.4);
      particlesRef.current.rotation.x += delta * (0.03 + metrics.mid * 0.2);
    }
  });

  return (
    <group name="cosmic-pulse-preset">
      {/* Central Luminous Pulsing Star Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshStandardMaterial
          color="#64DFFF"
          emissive="#8C6CFF"
          emissiveIntensity={1.4}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Expanding Harmonic Wavefront Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.8, 7.2, 64]} />
        <meshBasicMaterial color="#64DFFF" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 2.4, 0.2, 0]}>
        <ringGeometry args={[9.5, 9.9, 64]} />
        <meshBasicMaterial color="#8C6CFF" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={ring3Ref} rotation={[Math.PI / 1.8, -0.2, 0]}>
        <ringGeometry args={[13.2, 13.6, 64]} />
        <meshBasicMaterial color="#E8BC83" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Surrounding reactive sparkle particle cloud */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[particleColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.4}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

