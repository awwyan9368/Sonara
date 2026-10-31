'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Track } from '@/types';
import {
  PlanetArchetype,
  resolveTrackArchetype,
  getProceduralPlanetTexture,
  getProceduralPlanetBumpMap,
  getProceduralRingTexture,
  getProceduralCloudTexture,
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
  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Group>(null);

  // Derive stable planet archetype deterministically matching the 5 visual references
  const archetype: PlanetArchetype = useMemo(() => {
    return resolveTrackArchetype(track);
  }, [track]);

  const seed = useMemo(
    () => track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 1),
    [track.id]
  );

  const texture = useMemo(
    () => getProceduralPlanetTexture(archetype, seed, 512),
    [archetype, seed]
  );

  const bumpMap = useMemo(
    () => getProceduralPlanetBumpMap(archetype, seed, 256),
    [archetype, seed]
  );

  const cloudTexture = useMemo(() => {
    if (archetype === 'terrestrial') {
      return getProceduralCloudTexture(seed, 512);
    }
    return null;
  }, [archetype, seed]);

  // Rings: Only polar_vortex (Ref 1) and explicit gas giants have Cassini rings
  const shouldRenderRings = useMemo(() => {
    return archetype === 'polar_vortex' || (archetype === 'gas_giant' && Boolean(track.hasRings));
  }, [archetype, track.hasRings]);

  const ringTexture = useMemo(() => {
    if (!shouldRenderRings) return null;
    return getProceduralRingTexture('#3A2E44', 256);
  }, [shouldRenderRings]);

  // Atmospheric Rayleigh halo (airless cratered bodies like Ref 5 have no atmosphere)
  const hasAtmosphere = useMemo(() => {
    return archetype !== 'cratered_multispectral' && archetype !== 'barren_moon';
  }, [archetype]);

  // Atmosphere shader material with Rayleigh / sunset terminator scattering
  const atmosphereMaterial = useMemo(() => {
    const atmoColors: Record<PlanetArchetype, string> = {
      polar_vortex: '#86DFC2',
      golden_swirl: '#F2B855',
      aurora_oceanic: '#2FE8DC',
      ultraviolet_storm: '#7A28E8',
      cratered_multispectral: '#2868F0',
      terrestrial: '#64DFFF',
      gas_giant: track.planetColor || '#86DFC2',
      ice_world: '#A8F0FF',
      lava_world: '#FF5A36',
      barren_moon: '#8A99AD',
    };
    return createAtmosphereMaterial(atmoColors[archetype] || '#64DFFF', 1.0, 1.25);
  }, [archetype, track.planetColor]);

  // Has moon? Reference 4 (ultraviolet_storm) features an orbiting satellite moon
  const hasMoon = useMemo(() => archetype === 'ultraviolet_storm', [archetype]);

  const moonTexture = useMemo(() => {
    if (!hasMoon) return null;
    return getProceduralPlanetTexture('cratered_multispectral', seed + 888, 128);
  }, [hasMoon, seed]);

  useFrame((_, delta) => {
    if (!reducedMotion) {
      if (planetMeshRef.current) {
        planetMeshRef.current.rotation.y += delta * 0.35;
      }
      if (cloudMeshRef.current) {
        cloudMeshRef.current.rotation.y += delta * 0.42;
      }
      if (moonRef.current) {
        moonRef.current.rotation.y += delta * 0.8;
      }
    }
  });

  return (
    <group rotation={[0.38, 0, 0.18]}>
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
        <sphereGeometry args={[1.0, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={bumpMap || undefined}
          bumpScale={archetype === 'cratered_multispectral' ? 0.055 : 0.025}
          roughness={archetype === 'cratered_multispectral' ? 0.85 : 0.65}
          metalness={archetype === 'cratered_multispectral' ? 0.12 : 0.0}
          emissive={new THREE.Color(0x000000)}
          emissiveIntensity={0.0}
        />
      </mesh>

      {/* 2. Procedural Swirling Cloud Deck */}
      {cloudTexture && (
        <mesh ref={cloudMeshRef}>
          <sphereGeometry args={[1.02, 64, 64]} />
          <meshStandardMaterial
            map={cloudTexture}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 3. Atmospheric Scattering Halo (Rayleigh / Mie Shader) */}
      {hasAtmosphere && (
        <mesh ref={atmosphereRef}>
          <sphereGeometry args={[1.035, 64, 64]} />
          <primitive object={atmosphereMaterial} attach="material" />
        </mesh>
      )}

      {/* 4. Concentric Cassini Planetary Ring (Reference 1) */}
      {shouldRenderRings && ringTexture && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 2.45, 160]} />
          <meshBasicMaterial
            map={ringTexture}
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 5. Natural Satellite Moon (Reference 4) */}
      {hasMoon && (
        <group ref={moonRef}>
          <mesh position={[2.7, 0.25, 0]}>
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshStandardMaterial
              map={moonTexture || undefined}
              color="#A0AAB8"
              roughness={0.92}
            />
          </mesh>
        </group>
      )}

    </group>
  );
}
