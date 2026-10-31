'use client';

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Track, Artist } from '@/types';
import { SafeHtml } from '../components/SafeHtml';
import { DetailedPlanet } from './DetailedPlanet';
import {
  PlanetArchetype,
  resolveTrackArchetype,
  getProceduralPlanetTexture,
  getProceduralPlanetBumpMap,
  getProceduralRingTexture,
} from '../shaders/planetTextures';
import { createAtmosphereMaterial } from '../shaders/atmosphereShader';

interface TrackPlanetsProps {
  tracks: Track[];
  artists: Artist[];
  selectedArtist: Artist | null;
  selectedTrackId: string | null;
  onSelectTrack: (track: Track) => void;
  reducedMotion?: boolean;
}

interface SharedGeometries {
  sphere: THREE.SphereGeometry;
  atmosphere: THREE.SphereGeometry;
  ring: THREE.RingGeometry;
}

/**
 * Photorealistic Planetary Body (Active throughout the entire galaxy)
 * Features:
 * - Dynamic procedural surface textures matching the 5 AAA art reference archetypes
 * - Atmospheric Rayleigh Fresnel limb glow shell
 * - Multi-band concentric Cassini rings for polar_vortex
 * - Smooth real-time axial self-rotation
 */
function AestheticPlanetaryBody({
  track,
  isSelected,
  isHovered,
  onSelect,
  reducedMotion,
  sharedGeos,
  sharedAtmosphereMaterials,
}: {
  track: Track;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (track: Track) => void;
  reducedMotion: boolean;
  sharedGeos: SharedGeometries;
  sharedAtmosphereMaterials: Map<PlanetArchetype, THREE.ShaderMaterial>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const archetype: PlanetArchetype = useMemo(() => {
    return resolveTrackArchetype(track);
  }, [track]);

  const seed = useMemo(
    () => track.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 1),
    [track.id]
  );

  // Distant planets use optimized 256 texture (cached globally across 2 variations per archetype)
  const texture = useMemo(
    () => getProceduralPlanetTexture(archetype, seed, 256),
    [archetype, seed]
  );

  const shouldRenderRings = useMemo(() => {
    return archetype === 'polar_vortex' || (archetype === 'gas_giant' && Boolean(track.hasRings));
  }, [archetype, track.hasRings]);

  const ringTexture = useMemo(() => {
    if (!shouldRenderRings) return null;
    return getProceduralRingTexture('#3A2E44', 256);
  }, [shouldRenderRings]);

  // Shared atmosphere shader material (0 shader compilation stalls)
  const atmosphereMaterial = sharedAtmosphereMaterials.get(archetype) || sharedAtmosphereMaterials.get('terrestrial')!;

  // Gentle axial rotation
  useFrame((_, delta) => {
    if (!reducedMotion && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group rotation={[0.38, 0, 0.18]}>
      {/* 1. Procedurally Textured Planet Sphere */}
      <mesh
        ref={meshRef}
        geometry={sharedGeos.sphere}
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
        <meshStandardMaterial
          map={texture}
          roughness={archetype === 'cratered_multispectral' ? 0.85 : 0.65}
          metalness={archetype === 'cratered_multispectral' ? 0.12 : 0.0}
          emissive={new THREE.Color(0x000000)}
          emissiveIntensity={0.0}
        />
      </mesh>

      {/* 2. Atmospheric Fresnel Rim Glow Shell (Airless bodies like Ref 5 have no atmosphere) */}
      {archetype !== 'cratered_multispectral' && archetype !== 'barren_moon' && (
        <mesh geometry={sharedGeos.atmosphere}>
          <primitive object={atmosphereMaterial} attach="material" />
        </mesh>
      )}

      {/* 3. Multi-Banded Concentric Planetary Ring (Reference 1) */}
      {shouldRenderRings && ringTexture && (
        <mesh
          geometry={sharedGeos.ring}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial
            map={ringTexture}
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 4. Selection Ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.30, 64]} />
          <meshBasicMaterial color="#64DFFF" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

interface PlanetarySystemProps {
  artist: Artist;
  tracks: Track[];
  isSelectedArtist: boolean;
  selectedTrackId: string | null;
  hoveredTrackId: string | null;
  setHoveredTrackId: (id: string | null) => void;
  onSelectTrack: (track: Track) => void;
  sharedGeos: SharedGeometries;
  sharedAtmosphereMaterials: Map<PlanetArchetype, THREE.ShaderMaterial>;
  reducedMotion: boolean;
}

function SinglePlanetarySystem({
  artist,
  tracks,
  isSelectedArtist,
  selectedTrackId,
  hoveredTrackId,
  setHoveredTrackId,
  onSelectTrack,
  sharedGeos,
  sharedAtmosphereMaterials,
  reducedMotion,
}: PlanetarySystemProps) {
  const orbitsRef = useRef<THREE.Group>(null);

  if (!artist.position) return null;

  return (
    <group position={artist.position} name={`system-${artist.id}`}>
      {/* 1. Concentric Orbital Rings */}
      {tracks.map((track, idx) => {
        const radius = track.orbitRadius || 3.8 + (idx % 6) * 2.2;
        const isTrackSelected = selectedTrackId === track.id;

        return (
          <mesh key={`orbit-ring-${track.id}`} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
            <meshBasicMaterial
              color={track.planetColor || '#64DFFF'}
              transparent
              opacity={isTrackSelected ? 0.45 : isSelectedArtist ? 0.25 : 0.08}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* 2. Actively Revolving Planets Group */}
      <group ref={orbitsRef}>
        {tracks.map((track, idx) => {
          const radius = track.orbitRadius || 3.8 + (idx % 6) * 2.2;
          const initialAngle = ((idx % 6) / 6) * Math.PI * 2;
          const planetX = Math.cos(initialAngle) * radius;
          const planetZ = Math.sin(initialAngle) * radius;
          const planetY = Math.sin(initialAngle * 3.0) * 0.15;

          const isSelected = selectedTrackId === track.id;
          const isHovered = hoveredTrackId === track.id;
          const size = track.planetSize || 0.85;

          // Compute exact instantaneous 3D world position of planet
          const handleTrackSelect = () => {
            const rotY = orbitsRef.current?.rotation.y || 0;
            const curAngle = initialAngle + rotY;
            const currentWorldPos: [number, number, number] = [
              artist.position![0] + Math.cos(curAngle) * radius,
              artist.position![1] + planetY,
              artist.position![2] + Math.sin(curAngle) * radius,
            ];
            onSelectTrack({ ...track, position: currentWorldPos });
          };

          return (
            <group
              key={track.id}
              position={[planetX, planetY, planetZ]}
              scale={[size, size, size]}
            >
              {isSelectedArtist || isSelected ? (
                // Detailed multi-layer clouds/atmosphere/moon when parent artist or track is focused
                <DetailedPlanet
                  track={track}
                  isSelected={isSelected}
                  onSelect={handleTrackSelect}
                  reducedMotion={reducedMotion}
                />
              ) : (
                // Photorealistic planetary body active throughout the entire galaxy
                <AestheticPlanetaryBody
                  track={track}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  onSelect={handleTrackSelect}
                  reducedMotion={reducedMotion}
                  sharedGeos={sharedGeos}
                  sharedAtmosphereMaterials={sharedAtmosphereMaterials}
                />
              )}

              {/* Interactive Contextual Track Pill (hidden during macro inspection so planet is unobstructed) */}
              {(isHovered || (isSelectedArtist && !isSelected)) && (
                <SafeHtml
                  distanceFactor={38}
                  position={[0, 1.4, 0]}
                  center
                  zIndexRange={[75, 0]}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackSelect();
                    }}
                    className={`pointer-events-auto px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap backdrop-blur-md cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'bg-accent-violet border border-white text-white font-bold shadow-[0_0_12px_rgba(140,108,255,0.7)] scale-110'
                        : isHovered
                        ? 'bg-surface-raised border border-accent-cyan text-text-primary scale-105'
                        : 'bg-surface/80 border border-border-subtle text-text-secondary opacity-75'
                    }`}
                  >
                    <span>{track.title}</span>
                    {track.isFrequencyAvailable && (
                      <span className="text-accent-cyan ml-1">({track.playCount}x)</span>
                    )}
                  </div>
                </SafeHtml>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}

export function TrackPlanets({
  tracks,
  artists,
  selectedArtist,
  selectedTrackId,
  onSelectTrack,
  reducedMotion = false,
}: TrackPlanetsProps) {
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  // Group all tracks by their parent artist to form complete planetary systems
  const artistSystems = useMemo(() => {
    const artistMap = new Map<string, Artist>(artists.map((a) => [a.id, a]));
    const trackGroupMap = new Map<string, Track[]>();

    tracks.forEach((t) => {
      const parentId = t.artistIds?.[0];
      if (parentId) {
        const list = trackGroupMap.get(parentId) || [];
        list.push(t);
        trackGroupMap.set(parentId, list);
      }
    });

    const systems: Array<{ artist: Artist; tracks: Track[]; isSelectedArtist: boolean }> = [];
    trackGroupMap.forEach((trackList, artistId) => {
      const artist = artistMap.get(artistId);
      if (artist?.position) {
        systems.push({
          artist,
          tracks: trackList,
          isSelectedArtist: selectedArtist?.id === artist.id,
        });
      }
    });

    return systems;
  }, [artists, tracks, selectedArtist]);

  // Shared geometry for GPU optimization (RTX 2050 locked 60+ FPS)
  const sharedGeos: SharedGeometries = useMemo(() => ({
    sphere: new THREE.SphereGeometry(1.0, 24, 24),
    atmosphere: new THREE.SphereGeometry(1.035, 24, 24),
    ring: new THREE.RingGeometry(1.45, 2.45, 64),
  }), []);

  // Shared atmosphere materials across archetypes (eliminates compiling 100+ separate WebGL shader programs)
  const sharedAtmosphereMaterials = useMemo(() => {
    const map = new Map<PlanetArchetype, THREE.ShaderMaterial>();
    const atmoColors: Record<PlanetArchetype, string> = {
      polar_vortex: '#86DFC2',
      golden_swirl: '#F2B855',
      aurora_oceanic: '#2FE8DC',
      ultraviolet_storm: '#7A28E8',
      cratered_multispectral: '#2868F0',
      terrestrial: '#64DFFF',
      gas_giant: '#86DFC2',
      ice_world: '#A8F0FF',
      lava_world: '#FF5A36',
      barren_moon: '#8A99AD',
    };
    (Object.keys(atmoColors) as PlanetArchetype[]).forEach((arch) => {
      map.set(arch, createAtmosphereMaterial(atmoColors[arch], 1.0, 1.25));
    });
    return map;
  }, []);

  return (
    <group name="track-planetary-universe">
      {artistSystems.map((system) => (
        <SinglePlanetarySystem
          key={`planetary-system-${system.artist.id}`}
          artist={system.artist}
          tracks={system.tracks}
          isSelectedArtist={system.isSelectedArtist}
          selectedTrackId={selectedTrackId}
          hoveredTrackId={hoveredTrackId}
          setHoveredTrackId={setHoveredTrackId}
          onSelectTrack={onSelectTrack}
          sharedGeos={sharedGeos}
          sharedAtmosphereMaterials={sharedAtmosphereMaterials}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}
