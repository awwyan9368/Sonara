'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Track } from '@/types';
import {
  PlanetArchetype,
  getProceduralPlanetTexture,
  getProceduralRingTexture,
} from '../shaders/planetTextures';
import { createAtmosphereMaterial } from '../shaders/atmosphereShader';

interface DetailedPlanetProps {
  track: Track;
  isSelected: boolean;
  onSelect: (track: Track) => void;
  reducedMotion?: boolean;
}

export function DetailedPlanet({
  track,
  isSelected,
  onSelect,
  reducedMotion = false,
}: DetailedPlanetProps) {
  const planetMeshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Group>(null);

  // Derive stable planet archetype deterministically from track attributes & ID
  const archetype: PlanetArchetype = useMemo(() => {
    const idHash = track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const archetypes: PlanetArchetype[] = [
      'terrestrial',
      'gas_giant',
      'ice_world',
      'lava_world',
      'barren_moon',
      'gas_giant',
    ];
    return archetypes[idHash % archetypes.length];
  }, [track.id]);

  const seed = useMemo(
    () => track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 1),
    [track.id]
  );

  const texture = useMemo(
    () => getProceduralPlanetTexture(archetype, seed, 512),
    [archetype, seed]
  );

  const ringTexture = useMemo(() => {
    if (!track.hasRings) return null;
    return getProceduralRingTexture(track.planetColor || '#E8BC83', 256);
  }, [track.hasRings, track.planetColor]);

  // Atmosphere shader material
  const atmosphereMaterial = useMemo(() => {
    const atmoColors: Record<PlanetArchetype, string> = {
      terrestrial: '#64DFFF',
      gas_giant: track.planetColor || '#E8BC83',
      ice_world: '#A8F0FF',
      lava_world: '#FF5A36',
      barren_moon: '#8A99AD',
    };
    return createAtmosphereMaterial(atmoColors[archetype], 1.25);
  }, [archetype, track.planetColor]);

  // Planet size
  const size = track.planetSize || 0.65;

  // Has moon? 25% of planets have a natural satellite
  const hasMoon = useMemo(() => (seed % 4 === 0), [seed]);

  useFrame((_, delta) => {
    if (!reducedMotion) {
      if (planetMeshRef.current) {
        planetMeshRef.current.rotation.y += delta * 0.35;
      }
      if (moonRef.current) {
        moonRef.current.rotation.y += delta * 0.8;
      }
    }
  });

  return (
    <group>
      {/* 1. Main Procedural Planet Surface */}
      <mesh
        ref={planetMeshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(track);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          roughness={archetype === 'ice_world' ? 0.3 : archetype === 'gas_giant' ? 0.8 : 0.6}
          metalness={archetype === 'ice_world' ? 0.2 : 0.05}
          emissive={new THREE.Color(track.planetColor || '#64DFFF')}
          emissiveIntensity={isSelected ? 0.45 : archetype === 'lava_world' ? 0.3 : 0.05}
        />
      </mesh>

      {/* 2. Atmospheric Scattering Halo (Fresnel Shader) */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[size * 1.15, 32, 32]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      {/* 3. Detailed Planetary Ring with Cassini Division */}
      {track.hasRings && ringTexture && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.6, 0.2, 0]}>
          <ringGeometry args={[size * 1.4, size * 2.3, 64]} />
          <meshBasicMaterial
            map={ringTexture}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 4. Natural Satellite Moon */}
      {hasMoon && (
        <group ref={moonRef}>
          <mesh position={[size * 2.5, 0.2, 0]}>
            <sphereGeometry args={[size * 0.22, 16, 16]} />
            <meshStandardMaterial color="#A0A6B5" roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* 5. Selection Beacon */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.25, size * 1.3, 32]} />
          <meshBasicMaterial color="#64DFFF" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

