'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Track, Artist } from '@/types';
import { DetailedPlanet } from './DetailedPlanet';

interface TrackPlanetsProps {
  tracks: Track[];
  selectedArtist: Artist | null;
  selectedTrackId: string | null;
  onSelectTrack: (track: Track) => void;
  reducedMotion?: boolean;
}

export function TrackPlanets({
  tracks,
  selectedArtist,
  selectedTrackId,
  onSelectTrack,
  reducedMotion = false,
}: TrackPlanetsProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Filter tracks belonging to the currently selected artist
  const relevantTracks = selectedArtist
    ? tracks.filter((t) => t.artistIds.includes(selectedArtist.id))
    : [];

  useFrame((state) => {
    if (!reducedMotion && groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.children.forEach((orbitGroup, idx) => {
        const speed = 0.15 + (idx % 4) * 0.05;
        orbitGroup.rotation.y = time * speed;
      });
    }
  });

  if (!selectedArtist || !selectedArtist.position || relevantTracks.length === 0) {
    return null;
  }

  return (
    <group position={selectedArtist.position} name="track-planetary-system">
      <group ref={groupRef}>
        {relevantTracks.map((track, idx) => {
          const radius = track.orbitRadius || 6 + idx * 4.2;
          const isSelected = selectedTrackId === track.id;

          // Realistic orbital inclination tilt (between -10 and +10 degrees)
          const inclination = ((idx % 5) - 2) * 0.08;

          // Initial placement angle
          const initialAngle = (idx / relevantTracks.length) * Math.PI * 2;
          const planetX = Math.cos(initialAngle) * radius;
          const planetZ = Math.sin(initialAngle) * radius;

          return (
            <group key={track.id} rotation={[inclination, 0, 0]}>
              {/* Refined Semi-Transparent Orbital Ellipse Path */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius - 0.03, radius + 0.03, 96]} />
                <meshBasicMaterial
                  color={track.planetColor || '#64DFFF'}
                  transparent
                  opacity={isSelected ? 0.45 : 0.14}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              {/* Orbiting Celestial Body Position */}
              <group position={[planetX, 0, planetZ]}>
                <DetailedPlanet
                  track={track}
                  isSelected={isSelected}
                  onSelect={onSelectTrack}
                  reducedMotion={reducedMotion}
                />

                {/* Floating Track Name Pill */}
                <Html
                  distanceFactor={35}
                  position={[0, (track.planetSize || 0.65) + 0.8, 0]}
                  center
                  zIndexRange={[70, 0]}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrack(track);
                    }}
                    className={`pointer-events-auto px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-all select-none ${
                      isSelected
                        ? 'bg-accent-violet border border-white text-white font-semibold shadow-[0_0_12px_rgba(140,108,255,0.6)] scale-110'
                        : 'bg-surface/85 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary'
                    }`}
                    aria-label={`Select track ${track.title}`}
                  >
                    {track.title}
                  </button>
                </Html>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}
