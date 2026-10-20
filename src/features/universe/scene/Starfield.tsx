'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarfieldProps {
  count?: number;
  quality?: 'low' | 'medium' | 'high';
  reducedMotion?: boolean;
}

export function Starfield({ count = 2500, quality = 'high', reducedMotion = false }: StarfieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const effectiveCount = useMemo(() => {
    if (quality === 'low') return Math.floor(count * 0.35);
    if (quality === 'medium') return Math.floor(count * 0.65);
    return count;
  }, [count, quality]);

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(effectiveCount * 3);
    const col = new Float32Array(effectiveCount * 3);
    const sz = new Float32Array(effectiveCount);

    const baseColors = [
      new THREE.Color('#F3F4F8'), // White
      new THREE.Color('#A0A6B5'), // Soft blue-gray
      new THREE.Color('#64DFFF'), // Cyan accent
      new THREE.Color('#8C6CFF'), // Violet accent
      new THREE.Color('#E8BC83'), // Muted amber
    ];

    // Seeded pseudo-random generator for determinism
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < effectiveCount; i++) {
      // Spherical shell distribution with cosmic depth
      const radius = 60 + pseudoRandom() * 240;
      const theta = pseudoRandom() * Math.PI * 2;
      const phi = Math.acos(2 * pseudoRandom() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      const colorIndex = Math.floor(pseudoRandom() * baseColors.length);
      const chosenColor = baseColors[colorIndex];
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;

      sz[i] = 0.8 + pseudoRandom() * 2.2;
    }

    return [pos, col, sz];
  }, [effectiveCount]);

  useFrame((_, delta) => {
    if (!reducedMotion && pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.008;
      pointsRef.current.rotation.x += delta * 0.003;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.6}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

