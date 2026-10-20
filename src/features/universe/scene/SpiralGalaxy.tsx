'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TasteCluster } from '@/types';

interface SpiralGalaxyProps {
  cluster: TasteCluster;
  isSelected: boolean;
  onSelect: (clusterId: string) => void;
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
  reducedMotion?: boolean;
}

export function SpiralGalaxy({
  cluster,
  isSelected,
  onSelect,
  quality = 'high',
  reducedMotion = false,
}: SpiralGalaxyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const armsPointsRef = useRef<THREE.Points>(null);

  // Scaled star count based on quality
  const starCount = useMemo(() => {
    switch (quality) {
      case 'ultra':
        return 2800;
      case 'high':
        return 1800;
      case 'balanced':
        return 1000;
      case 'performance':
        return 500;
    }
  }, [quality]);

  // Procedural Logarithmic Spiral Generation
  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const sz = new Float32Array(starCount);

    const baseColor = new THREE.Color(cluster.color);
    const coreColor = new THREE.Color('#FFF5EA'); // Warm galactic core
    const dustColor = new THREE.Color('#3A2A4A'); // Dark absorption dust
    const armHighlightColor = new THREE.Color(cluster.color).offsetHSL(0.08, 0.2, 0.2);

    // Number of spiral arms (2 or 3 depending on cluster id hash)
    const arms = (cluster.id.length % 2 === 0) ? 2 : 3;
    const maxRadius = cluster.radius;

    let seed = cluster.id.charCodeAt(0) * 100 + cluster.id.charCodeAt(1);
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // 30% of stars in core bulge, 70% in spiral arms
      const isCore = rnd() < 0.28;

      if (isCore) {
        // Spherical/ellipsoidal central bulge distribution
        const r = Math.pow(rnd(), 1.8) * (maxRadius * 0.28);
        const theta = rnd() * Math.PI * 2;
        const phi = Math.acos(2 * rnd() - 1);

        pos[i3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i3 + 1] = r * Math.cos(phi) * 0.45; // Flattened disk
        pos[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        // Core stars: brilliant warm white-gold
        const c = coreColor.clone().lerp(baseColor, 0.2 + rnd() * 0.3);
        col[i3] = c.r;
        col[i3 + 1] = c.g;
        col[i3 + 2] = c.b;
        sz[i] = 1.2 + rnd() * 2.2;
      } else {
        // Logarithmic spiral arms
        const armIndex = i % arms;
        const armOffset = (armIndex / arms) * Math.PI * 2;
        const r = (maxRadius * 0.22) + Math.pow(rnd(), 1.2) * (maxRadius * 0.78);

        // Winding angle proportional to distance
        const twistRate = 3.6;
        const angle = Math.log(r / (maxRadius * 0.22)) * twistRate + armOffset;

        // Arm thickness & stellar dispersion
        const dispersion = (r / maxRadius) * 4.5;
        const dx = (rnd() - 0.5) * dispersion;
        const dy = (rnd() - 0.5) * (dispersion * 0.35); // Thin galactic disk
        const dz = (rnd() - 0.5) * dispersion;

        pos[i3] = Math.cos(angle) * r + dx;
        pos[i3 + 1] = dy;
        pos[i3 + 2] = Math.sin(angle) * r + dz;

        // Is it an interstellar dust absorption lane or young star cluster?
        const isDust = rnd() < 0.18;
        if (isDust) {
          col[i3] = dustColor.r;
          col[i3 + 1] = dustColor.g;
          col[i3 + 2] = dustColor.b;
          sz[i] = 1.6 + rnd() * 1.5;
        } else {
          // Luminous young blue/cyan/cluster color stars
          const t = r / maxRadius;
          const starCol = baseColor.clone().lerp(armHighlightColor, t);
          col[i3] = starCol.r;
          col[i3 + 1] = starCol.g;
          col[i3 + 2] = starCol.b;
          sz[i] = 0.8 + rnd() * 1.8;
        }
      }
    }

    return { positions: pos, colors: col, sizes: sz };
  }, [cluster, starCount]);

  // Differential galactic rotation animation
  useFrame((_, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
    }
  });

  const coreRadius = Math.max(3.0, cluster.radius * 0.18);

  return (
    <group position={cluster.center}>
      <group ref={groupRef}>
        {/* Central Luminous Galactic Core (Bulge) */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[coreRadius, 24, 24]} />
          <meshBasicMaterial
            color={cluster.color}
            transparent
            opacity={isSelected ? 0.35 : 0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Hot white inner singularity glow */}
        <mesh>
          <sphereGeometry args={[coreRadius * 0.5, 16, 16]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={isSelected ? 0.6 : 0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Spiral Arm Gaseous Volumetric Disc */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[coreRadius * 0.8, cluster.radius * 1.05, 48]} />
          <meshBasicMaterial
            color={cluster.color}
            transparent
            opacity={isSelected ? 0.14 : 0.06}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Spiral Arm Star Populations (Points) */}
        <points ref={armsPointsRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
          </bufferGeometry>
          <pointsMaterial
            size={1.6}
            vertexColors
            transparent
            opacity={isSelected ? 0.95 : 0.8}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Outer Orbit Resonance Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[cluster.radius * 0.99, cluster.radius * 1.01, 64]} />
          <meshBasicMaterial
            color={cluster.color}
            transparent
            opacity={isSelected ? 0.45 : 0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Floating Interactive Galactic Label */}
      <Html
        position={[0, cluster.radius * 0.9, 0]}
        center
        distanceFactor={90}
        zIndexRange={[100, 0]}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(cluster.id);
          }}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer select-none ${
            isSelected
              ? 'bg-surface-raised/95 border-accent-cyan shadow-[0_0_20px_rgba(100,223,255,0.5)] text-text-primary scale-110'
              : 'bg-surface/70 border-border-subtle hover:border-text-secondary text-text-secondary hover:text-text-primary hover:scale-105'
          }`}
          aria-label={`Select galaxy ${cluster.label}`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
            style={{ backgroundColor: cluster.color, boxShadow: `0 0 10px ${cluster.color}` }}
          />
          <span className="text-xs font-semibold tracking-wide uppercase font-mono">
            {cluster.label}
          </span>
          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-full bg-surface-raised border border-border-subtle font-mono">
            {cluster.memberArtistIds.length} Stars
          </span>
        </button>
      </Html>
    </group>
  );
}

