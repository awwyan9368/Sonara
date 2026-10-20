'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Track, Artist } from '@/types';

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

  // Filter tracks belonging to the currently selected artist (or prominent tracks)
  const relevantTracks = selectedArtist
    ? tracks.filter((t) => t.artistIds.includes(selectedArtist.id))
    : [];

  useFrame((_, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        const speed = 0.2 + (index % 3) * 0.1;
        child.rotation.y += delta * speed;
      });
    }
  });

  if (!selectedArtist || !selectedArtist.position || relevantTracks.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef} position={selectedArtist.position} name="track-orbit-system">
      {relevantTracks.map((track, idx) => {
        const radius = track.orbitRadius || 5 + idx * 3.5;
        const planetSize = track.planetSize || 0.6;
        const color = new THREE.Color(track.planetColor || '#64DFFF');
        const isSelected = selectedTrackId === track.id;

        // Spread initial angles deterministically
        const initialAngle = (idx / relevantTracks.length) * Math.PI * 2;
        const planetX = Math.cos(initialAngle) * radius;
        const planetZ = Math.sin(initialAngle) * radius;

        return (
          <group key={track.id}>
            {/* Visual Orbital Track Path */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius - 0.04, radius + 0.04, 64]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.18}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Orbiting Planet Body */}
            <group position={[planetX, 0, planetZ]}>
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTrack(track);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'auto';
                }}
              >
                <sphereGeometry args={[planetSize, 16, 16]} />
                <meshStandardMaterial
                  color={color}
                  roughness={0.6}
                  metalness={0.2}
                  emissive={color}
                  emissiveIntensity={isSelected ? 0.9 : 0.3}
                />
              </mesh>

              {/* Optional Planetary Ring */}
              {track.hasRings && (
                <mesh rotation={[Math.PI / 3, 0, 0]}>
                  <ringGeometry args={[planetSize * 1.4, planetSize * 2.0, 32]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.45}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}

              {/* Hover / Selection Label */}
              <Html distanceFactor={30} position={[0, planetSize + 0.6, 0]} center>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrack(track);
                  }}
                  className={`pointer-events-auto px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-accent-violet border border-white text-white font-medium'
                      : 'bg-surface/80 border border-border-subtle text-text-secondary hover:text-text-primary'
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
  );
}

