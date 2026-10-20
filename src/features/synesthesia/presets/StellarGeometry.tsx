'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

interface StellarGeometryProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

export function StellarGeometry({
  sensitivity = 1.0,
  reducedMotion = false,
}: StellarGeometryProps) {
  const outerPolyRef = useRef<THREE.Mesh>(null);
  const midPolyRef = useRef<THREE.Mesh>(null);
  const innerPolyRef = useRef<THREE.Mesh>(null);
  const latticeRef = useRef<THREE.LineSegments>(null);

  useFrame((_, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);

    if (outerPolyRef.current && !reducedMotion) {
      outerPolyRef.current.rotation.x += delta * (0.2 + metrics.bass * 0.4);
      outerPolyRef.current.rotation.y += delta * (0.15 + metrics.mid * 0.3);
      const s = 1.0 + metrics.bass * 0.5;
      outerPolyRef.current.scale.set(s, s, s);
    }

    if (midPolyRef.current && !reducedMotion) {
      midPolyRef.current.rotation.y -= delta * (0.3 + metrics.treble * 0.5);
      midPolyRef.current.rotation.z += delta * (0.2 + metrics.mid * 0.3);
      const s = 1.0 + metrics.mid * 0.4;
      midPolyRef.current.scale.set(s, s, s);
    }

    if (innerPolyRef.current) {
      const s = 1.0 + metrics.overallEnergy * 0.8;
      innerPolyRef.current.scale.set(s, s, s);
      if (!reducedMotion) {
        innerPolyRef.current.rotation.x -= delta * 0.4;
      }
    }
  });

  return (
    <group name="stellar-geometry-preset">
      {/* Outer Polyhedral Wireframe Shell */}
      <mesh ref={outerPolyRef}>
        <icosahedronGeometry args={[14, 1]} />
        <meshBasicMaterial
          color="#64DFFF"
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Middle Octahedral Rotating Ring */}
      <mesh ref={midPolyRef}>
        <octahedronGeometry args={[9, 0]} />
        <meshStandardMaterial
          color="#E8BC83"
          emissive="#8C6CFF"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.9}
          wireframe
        />
      </mesh>

      {/* Inner Solid Geometric Core */}
      <mesh ref={innerPolyRef}>
        <dodecahedronGeometry args={[4.5, 0]} />
        <meshStandardMaterial
          color="#8C6CFF"
          emissive="#64DFFF"
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

