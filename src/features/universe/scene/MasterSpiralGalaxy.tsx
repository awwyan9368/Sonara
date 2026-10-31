'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TasteCluster } from '@/types';
import { getStarParticleTexture, getNebulaDustTexture, getCrossSpikeTexture } from '../shaders/particleTextures';

interface MasterSpiralGalaxyProps {
  clusters?: TasteCluster[];
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
  reducedMotion?: boolean;
}

/**
 * Photorealistic Master Spiral Galaxy
 * Modeled directly on high-contrast spiral astrophotography (Whirlpool / Pinwheel archetype).
 * Features:
 * - Supermassive radiant core with exponential stellar density
 * - Logarithmic spiral arms governed by astronomical density wave physics
 * - High contrast with dark inter-arm voids (no muddying scatter)
 * - Dense star-forming clusters (knots) peppered along arm spines
 * - Diffuse luminous core bulge sprite & central cross-diffraction spike
 */
export function MasterSpiralGalaxy({
  clusters = [],
  quality = 'high',
  reducedMotion = false,
}: MasterSpiralGalaxyProps) {
  const galaxyGroupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const starsPointsRef = useRef<THREE.Points>(null);
  const dustPointsRef = useRef<THREE.Points>(null);
  const knotsPointsRef = useRef<THREE.Points>(null);

  // Scaled star count based on quality setting
  const { totalStars, coreStars, armStars, dustCount, knotCount } = useMemo(() => {
    switch (quality) {
      case 'ultra':
        return { totalStars: 68000, coreStars: 18000, armStars: 42000, dustCount: 8000, knotCount: 90 };
      case 'high':
        return { totalStars: 48000, coreStars: 14000, armStars: 28000, dustCount: 6000, knotCount: 65 };
      case 'balanced':
        return { totalStars: 28000, coreStars: 8000, armStars: 16000, dustCount: 3500, knotCount: 40 };
      case 'performance':
        return { totalStars: 15000, coreStars: 4500, armStars: 8500, dustCount: 2000, knotCount: 25 };
    }
  }, [quality]);

  // Procedural Sprite Textures
  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const coreGlowTexture = useMemo(() => getNebulaDustTexture(), []);
  const crossSpikeTexture = useMemo(() => getCrossSpikeTexture(), []);

  // Mathematical generation of the master spiral galaxy
  const {
    starPositions,
    starColors,
    starSizes,
    dustPositions,
    dustColors,
    dustSizes,
    knotPositions,
    knotColors,
    knotSizes,
  } = useMemo(() => {
    // Grand scale radius to effortlessly encompass all artist star systems and planetary orbits
    const maxRadius = 155.0;
    const coreRadius = 18.0;
    const numArms = 4; // 4 grand design logarithmic spiral arms spanning 360 degrees

    // PRNG with deterministic seed
    let seed = 42179;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const randNorm = () => {
      // Box-Muller transform for true Gaussian distribution
      const u1 = Math.max(1e-6, rnd());
      const u2 = rnd();
      return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    };

    // Color definitions
    const pureWhite = new THREE.Color('#FFFFFF');
    const blueWhite = new THREE.Color('#EBF3FF');
    const paleCyan = new THREE.Color('#D2E9FF');
    const warmBulge = new THREE.Color('#FFF4E6');
    const goldCore = new THREE.Color('#FFE8CC');

    // 1. Core Stars (Exponential Bulge: r ~ exp(-r / r_c))
    const sPos: number[] = [];
    const sCol: number[] = [];
    const sSz: number[] = [];

    for (let i = 0; i < coreStars; i++) {
      // Powerful central concentration: r = coreRadius * (rnd()^2.6)
      const r = coreRadius * Math.pow(rnd(), 2.6);
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2.0 * rnd() - 1.0);

      // Spheroidal flattening towards galactic plane
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.42 * (1.0 - r / coreRadius * 0.5);
      const z = r * Math.sin(phi) * Math.sin(theta);

      sPos.push(x, y, z);

      // Core stars: Brilliant white-hot center transitioning to warm stellar population
      const t = r / coreRadius;
      const col = pureWhite.clone().lerp(goldCore, t * 0.7);
      const brightness = 1.0 - t * 0.25;

      sCol.push(col.r * brightness, col.g * brightness, col.b * brightness);
      sSz.push(0.7 + rnd() * 1.6);
    }

    // 2. Logarithmic Spiral Arms (Density Wave Physics)
    for (let i = 0; i < armStars; i++) {
      const armIdx = i % numArms;
      const isMajorArm = armIdx < 2;
      const baseArmAngle = (armIdx / numArms) * Math.PI * 2;

      // Radial distribution along arm (power law density falloff)
      const rNorm = Math.pow(rnd(), 1.25);
      const r = coreRadius * 0.85 + rNorm * (maxRadius - coreRadius * 0.85);

      // Spiral pitch angle: theta(r) = baseAngle + A * r^0.60
      const windingSpeed = 0.62;
      const spiralTheta = baseArmAngle + windingSpeed * Math.pow(r, 0.60);

      // Density wave compression: Tight Gaussian dispersion along arm ridge
      const armSpread = (isMajorArm ? 1.0 : 1.5) + (r / maxRadius) * 4.2;
      const perpOffset = randNorm() * armSpread;
      const verticalThickness = randNorm() * (0.8 + (r / maxRadius) * 2.8);

      // Tangent & Normal unit vectors in galactic plane
      const cosT = Math.cos(spiralTheta);
      const sinT = Math.sin(spiralTheta);

      // Offset perpendicularly to spiral curve
      const x = r * cosT - sinT * perpOffset;
      const z = r * sinT + cosT * perpOffset;
      const y = verticalThickness;

      sPos.push(x, y, z);

      // Color and size: Brilliant Population I blue-white and pure white stars
      const t = (r - coreRadius) / (maxRadius - coreRadius);
      const col = pureWhite.clone().lerp(isMajorArm ? blueWhite : paleCyan, rnd() * 0.8);
      const brightness = Math.max(0.3, 1.0 - t * 0.45);

      sCol.push(col.r * brightness, col.g * brightness, col.b * brightness);
      sSz.push(0.6 + rnd() * 1.5 + (rnd() < 0.08 ? 1.8 : 0));
    }

    // 3. Dense Stellar Clusters / Knots along Spiral Arms (Matching reference image clumps)
    const kPos: number[] = [];
    const kCol: number[] = [];
    const kSz: number[] = [];

    for (let k = 0; k < knotCount; k++) {
      const armIdx = k % numArms;
      const baseArmAngle = (armIdx / numArms) * Math.PI * 2;
      const r = coreRadius * 1.2 + (k / knotCount) * (maxRadius - coreRadius * 1.4);
      const spiralTheta = baseArmAngle + 0.62 * Math.pow(r, 0.60) + (rnd() - 0.5) * 0.15;

      const knotCenterX = r * Math.cos(spiralTheta);
      const knotCenterZ = r * Math.sin(spiralTheta);
      const knotCenterY = (rnd() - 0.5) * 1.5;

      // Each knot contains 40-70 dense clustered stars
      const knotStars = 45;
      for (let s = 0; s < knotStars; s++) {
        const kr = Math.pow(rnd(), 1.5) * 3.0;
        const kTheta = rnd() * Math.PI * 2;
        const kPhi = Math.acos(2.0 * rnd() - 1.0);

        kPos.push(
          knotCenterX + kr * Math.sin(kPhi) * Math.cos(kTheta),
          knotCenterY + kr * Math.cos(kPhi) * 0.6,
          knotCenterZ + kr * Math.sin(kPhi) * Math.sin(kTheta)
        );

        // Radiant white with high intensity
        kCol.push(1.0, 1.0, 1.0);
        kSz.push(1.2 + rnd() * 2.2);
      }
    }

    // 4. Subtle Interstellar Dust Absorption Lanes (Inner arm edges)
    const dPos: number[] = [];
    const dCol: number[] = [];
    const dSz: number[] = [];

    for (let d = 0; d < dustCount; d++) {
      const armIdx = d % numArms;
      const baseArmAngle = (armIdx / numArms) * Math.PI * 2;
      const r = coreRadius * 1.1 + Math.pow(rnd(), 1.1) * (maxRadius * 0.85);

      // Offset slightly to the inner edge of each spiral arm
      const dustTheta = baseArmAngle + 0.62 * Math.pow(r, 0.60) - 0.16;
      const jitter = randNorm() * (1.2 + (r / maxRadius) * 3.2);

      dPos.push(
        r * Math.cos(dustTheta) - Math.sin(dustTheta) * jitter,
        (rnd() - 0.5) * 1.4,
        r * Math.sin(dustTheta) + Math.cos(dustTheta) * jitter
      );

      // Dark absorbing soot
      dCol.push(0.04, 0.03, 0.06);
      dSz.push(4.0 + rnd() * 5.0);
    }

    return {
      starPositions: new Float32Array(sPos),
      starColors: new Float32Array(sCol),
      starSizes: new Float32Array(sSz),
      dustPositions: new Float32Array(dPos),
      dustColors: new Float32Array(dCol),
      dustSizes: new Float32Array(dSz),
      knotPositions: new Float32Array(kPos),
      knotColors: new Float32Array(kCol),
      knotSizes: new Float32Array(kSz),
    };
  }, [clusters.length, coreStars, armStars, dustCount, knotCount]);

  return (
    <group ref={galaxyGroupRef} position={[0, 0, 0]} name="master-spiral-galaxy">
      {/* 1. Supermassive Radiant Core Glow Sprite (Bulge Luminance) */}
      <mesh ref={coreMeshRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[52, 52]} />
        <meshBasicMaterial
          map={coreGlowTexture}
          color="#FFF8EE"
          transparent
          opacity={0.88}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary Inner Core High-Energy Flare */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial
          map={coreGlowTexture}
          color="#FFFFFF"
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Central Supermassive Star Diffraction Spikes */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <planeGeometry args={[46, 46]} />
        <meshBasicMaterial
          map={crossSpikeTexture}
          color="#FFFFFF"
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Main Stellar Population (Core Bulge + Spiral Arms) */}
      <points ref={starsPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[starColors, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[starSizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.6}
          map={starTexture}
          vertexColors
          transparent
          opacity={0.92}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 3. High-Density Star-Forming Knots & Clusters */}
      <points ref={knotsPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[knotPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[knotColors, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[knotSizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={2.2}
          map={starTexture}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 4. Interstellar Dark Molecular Dust Lanes (Contrast & Depth) */}
      <points ref={dustPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[dustColors, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[dustSizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={5.5}
          map={coreGlowTexture}
          vertexColors
          transparent
          opacity={0.65}
          sizeAttenuation
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

