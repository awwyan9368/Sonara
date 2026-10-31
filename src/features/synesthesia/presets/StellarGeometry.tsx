'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getStarParticleTexture, getEnergySparkTexture } from '../../universe/shaders/particleTextures';

interface StellarGeometryProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

/**
 * PRESET 5 — STELLAR GEOMETRY (Reference C)
 * High-contrast central cosmic structure.
 * - Blindingly bright central stellar source with crisp four-point cross-spikes.
 * - Intricate dark curved filamentary webbing / silhouette cage (Dyson sphere lattice).
 * - Dense surrounding field of starlight with extreme black-and-white contrast.
 */
export function StellarGeometry({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: StellarGeometryProps) {
  const centralStarRef = useRef<THREE.Mesh>(null);
  const coreCrossHRef = useRef<THREE.Mesh>(null);
  const coreCrossVRef = useRef<THREE.Mesh>(null);
  const webbingGroupRef = useRef<THREE.Group>(null);
  const starlightFieldRef = useRef<THREE.Points>(null);

  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const sparkTexture = useMemo(() => getEnergySparkTexture(), []);

  const starlightCount = Math.floor(3200 * particleDensity);

  // 1. High-Contrast Dense Spherical Starlight Field (Reference C)
  const { starPositions, starOrigPos, starSizes } = useMemo(() => {
    const pos = new Float32Array(starlightCount * 3);
    const orig = new Float32Array(starlightCount * 3);
    const sz = new Float32Array(starlightCount);

    const maxR = 34.0;
    const innerVoidR = 8.0;

    for (let i = 0; i < starlightCount; i++) {
      const i3 = i * 3;
      const u = Math.pow(Math.random(), 1.4);
      const r = innerVoidR + u * (maxR - innerVoidR);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      orig[i3] = x;
      orig[i3 + 1] = y;
      orig[i3 + 2] = z;

      sz[i] = 0.8 + Math.random() * 1.5;
    }

    return { starPositions: pos, starOrigPos: orig, starSizes: sz };
  }, [starlightCount]);

  // 2. Intricate Dark Curved Webbing / Filament Silhouettes (Dyson Sphere Lattice)
  const webbingLines = useMemo(() => {
    const lines: THREE.Line[] = [];
    const numArches = 12;
    const segments = 64;
    const mat = new THREE.LineBasicMaterial({
      color: 0x0a0d14,
      linewidth: 3,
      transparent: true,
      opacity: 0.92,
    });

    for (let a = 0; a < numArches; a++) {
      const pos: number[] = [];
      const baseAngle = (a / numArches) * Math.PI * 2;
      const tilt = (a % 3 - 1) * 0.45;

      for (let s = 0; s <= segments; s++) {
        const t = (s / segments) * Math.PI; // 0 to PI
        const r = 11.5 + Math.sin(t * 3.0) * 1.8;
        const theta = baseAngle + Math.sin(t) * 0.7;

        const x = r * Math.sin(t) * Math.cos(theta);
        const y = r * Math.cos(t) * (1.0 + tilt * 0.3);
        const z = r * Math.sin(t) * Math.sin(theta);

        pos.push(x, y, z);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      lines.push(new THREE.Line(geo, mat));
    }
    return lines;
  }, []);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Blinding Central Star Pulsing on Sub-bass
    if (centralStarRef.current) {
      const s = 1.0 + metrics.subBass * 0.35 + metrics.transient * 0.4;
      centralStarRef.current.scale.set(s, s, s);
    }

    // 2. Cross-Spike Flare Modulation on Treble & Transients
    if (coreCrossHRef.current && coreCrossVRef.current) {
      const flareLen = 1.0 + metrics.treble * 0.6 + metrics.transient * 0.8;
      coreCrossHRef.current.scale.set(flareLen, 1.0, 1.0);
      coreCrossVRef.current.scale.set(1.0, flareLen, 1.0);
    }

    // 3. Webbing Lattice Rotation and Flex
    if (webbingGroupRef.current && !reducedMotion) {
      webbingGroupRef.current.rotation.y += delta * 0.12;
      webbingGroupRef.current.rotation.x = Math.sin(time * 0.4) * 0.15;
      const latticeScale = 1.0 + metrics.bass * 0.12;
      webbingGroupRef.current.scale.set(latticeScale, latticeScale, latticeScale);
    }

    // 4. Starlight Shimmer
    if (starlightFieldRef.current) {
      if (!reducedMotion) {
        starlightFieldRef.current.rotation.y += delta * 0.02;
      }
    }
  });

  return (
    <group name="stellar-geometry-preset">
      {/* 1. Blindingly Bright Central Stellar Source (Reference C) */}
      <mesh ref={centralStarRef} position={[0, 0, 0]}>
        <sphereGeometry args={[4.2, 32, 32]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* 2. Razor-Sharp Four-Point Cross-Diffraction Spikes (Reference C) */}
      <mesh ref={coreCrossHRef} position={[0, 0, 0.1]}>
        <planeGeometry args={[44.0, 0.14]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={coreCrossVRef} position={[0, 0, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[44.0, 0.14]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Soft Core Radiance Halo */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[14.0, 14.0]} />
        <meshBasicMaterial
          map={starTexture}
          color="#FFFFFF"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Intricate Dark Curved Webbing / Silhouette Dyson Lattice (Reference C) */}
      <group ref={webbingGroupRef}>
        {webbingLines.map((lineObj, idx) => (
          <primitive key={idx} object={lineObj} />
        ))}

        {/* Outer Dark Silhouette Rings */}
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[11.2, 12.8, 64]} />
          <meshBasicMaterial color="#06080E" side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 3, Math.PI / 4, 0]}>
          <ringGeometry args={[11.2, 12.8, 64]} />
          <meshBasicMaterial color="#06080E" side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* 5. Dense High-Contrast Field of Starlight (Reference C) */}
      <points ref={starlightFieldRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          color="#FFFFFF"
          size={1.4}
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
