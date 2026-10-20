'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarfieldProps {
  count?: number;
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
  reducedMotion?: boolean;
}

export function Starfield({ count = 3500, quality = 'high', reducedMotion = false }: StarfieldProps) {
  const layerARef = useRef<THREE.Points>(null);
  const layerBRef = useRef<THREE.Points>(null);
  const layerCRef = useRef<THREE.Points>(null);
  const distantGalaxiesRef = useRef<THREE.Points>(null);

  const effectiveCount = useMemo(() => {
    switch (quality) {
      case 'ultra':
        return Math.floor(count * 1.5);
      case 'high':
        return count;
      case 'balanced':
        return Math.floor(count * 0.65);
      case 'performance':
        return Math.floor(count * 0.35);
    }
  }, [count, quality]);

  // Real Astronomical Spectral Colors (Planck Blackbody Distribution)
  const stellarSpectralPalette = useMemo(
    () => [
      new THREE.Color('#9bb0ff'), // Class O: Deep Blue (~35,000K)
      new THREE.Color('#aabfff'), // Class B: Blue-White (~20,000K)
      new THREE.Color('#cad7ff'), // Class A: White (~10,000K)
      new THREE.Color('#f8f9ff'), // Class F: Yellow-White (~7,000K)
      new THREE.Color('#fff4e8'), // Class G: Solar Gold (~5,500K)
      new THREE.Color('#ffd2a1'), // Class K: Orange (~4,000K)
      new THREE.Color('#ffcc6f'), // Class M: Red Dwarf (~3,000K)
    ],
    []
  );

  // Deterministic seed random generator
  const createRnd = (seedInit: number) => {
    let s = seedInit;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  };

  // Layer A: Distant Cosmic Background (Millions of stars aesthetic)
  const layerA = useMemo(() => {
    const rnd = createRnd(101);
    const n = Math.floor(effectiveCount * 0.55);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const r = 220 + rnd() * 320;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = stellarSpectralPalette[Math.floor(rnd() * stellarSpectralPalette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      sz[i] = 0.6 + rnd() * 1.2;
    }

    return { pos, col, sz };
  }, [effectiveCount, stellarSpectralPalette]);

  // Layer B: Intermediate Stellar Neighborhoods (Rich irregular clustering)
  const layerB = useMemo(() => {
    const rnd = createRnd(202);
    const n = Math.floor(effectiveCount * 0.35);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      // Clustered distribution
      const clusterAngle = (Math.floor(rnd() * 6) / 6) * Math.PI * 2;
      const r = 80 + rnd() * 140;
      const theta = clusterAngle + (rnd() - 0.5) * 0.8;
      const phi = Math.acos(2 * rnd() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (rnd() - 0.5) * 90;
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = stellarSpectralPalette[Math.floor(rnd() * stellarSpectralPalette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      sz[i] = 1.0 + rnd() * 1.8;
    }

    return { pos, col, sz };
  }, [effectiveCount, stellarSpectralPalette]);

  // Layer C: Nearby Bright Stars with Halos & Parallax
  const layerC = useMemo(() => {
    const rnd = createRnd(303);
    const n = Math.floor(effectiveCount * 0.1);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const r = 35 + rnd() * 70;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = stellarSpectralPalette[Math.floor(rnd() * stellarSpectralPalette.length)];
      col[i * 3] = color.r * 1.2;
      col[i * 3 + 1] = color.g * 1.2;
      col[i * 3 + 2] = color.b * 1.2;

      sz[i] = 2.4 + rnd() * 2.8;
    }

    return { pos, col, sz };
  }, [effectiveCount, stellarSpectralPalette]);

  // Layer D: Distant Background Galaxies (Faint diffuse galactic discs)
  const layerD = useMemo(() => {
    const rnd = createRnd(404);
    const n = 120; // 120 distant faint galaxies in cosmic background
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const r = 450 + rnd() * 150;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      col[i * 3] = 0.5 + rnd() * 0.5;
      col[i * 3 + 1] = 0.5 + rnd() * 0.5;
      col[i * 3 + 2] = 0.8 + rnd() * 0.2;

      sz[i] = 4.5 + rnd() * 6.0;
    }

    return { pos, col, sz };
  }, []);

  useFrame((state, delta) => {
    if (!reducedMotion) {
      if (layerARef.current) layerARef.current.rotation.y += delta * 0.0012;
      if (layerBRef.current) layerBRef.current.rotation.y += delta * 0.0028;
      if (layerCRef.current) layerCRef.current.rotation.y += delta * 0.0055;
    }
  });

  return (
    <group name="deep-astronomical-starfield">
      {/* Layer A: Ultra-Distant Cosmic Background */}
      <points ref={layerARef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[layerA.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[layerA.col, 3]} />
          <bufferAttribute attach="attributes-size" args={[layerA.sz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.2}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Layer B: Intermediate Stellar Neighborhoods */}
      <points ref={layerBRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[layerB.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[layerB.col, 3]} />
          <bufferAttribute attach="attributes-size" args={[layerB.sz, 1]} />
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

      {/* Layer C: Nearby Prominent Stars with Parallax */}
      <points ref={layerCRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[layerC.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[layerC.col, 3]} />
          <bufferAttribute attach="attributes-size" args={[layerC.sz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={2.5}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Layer D: Distant Faint Galaxies */}
      <points ref={distantGalaxiesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[layerD.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[layerD.col, 3]} />
          <bufferAttribute attach="attributes-size" args={[layerD.sz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={5.0}
          vertexColors
          transparent
          opacity={0.4}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
