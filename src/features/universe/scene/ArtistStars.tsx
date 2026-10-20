'use client';

import React, { useState, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Artist } from '@/types';
import { createStarCoronaMaterial } from '../shaders/starCoronaShader';

interface ArtistStarsProps {
  artists: Artist[];
  selectedArtistId: string | null;
  onSelectArtist: (artist: Artist) => void;
  labelDensity?: 'minimal' | 'balanced' | 'all';
}

export function ArtistStars({
  artists,
  selectedArtistId,
  onSelectArtist,
  labelDensity = 'balanced',
}: ArtistStarsProps) {
  const [hoveredArtistId, setHoveredArtistId] = useState<string | null>(null);

  // Stellar spectral classifications based on prominence & genre
  const getStarColor = (artist: Artist): string => {
    if (artist.prominence > 90) return '#9bb0ff'; // Brilliant Class O Blue Giant
    if (artist.prominence > 80) return '#cad7ff'; // Class A White Supergiant
    if (artist.prominence > 70) return '#fff4e8'; // Class G Solar Main Sequence
    if (artist.prominence > 60) return '#ffd2a1'; // Class K Orange Giant
    return '#ffcc6f'; // Class M Red Star
  };

  return (
    <group name="artist-stellar-objects">
      {artists.map((artist) => {
        if (!artist.position) return null;

        const isSelected = selectedArtistId === artist.id;
        const isHovered = hoveredArtistId === artist.id;

        // Size proportional to prominence (0.7 to 2.4 units)
        const baseRadius = 0.65 + (artist.prominence / 100) * 1.5;
        const currentScale = isSelected ? 1.5 : isHovered ? 1.25 : 1.0;

        const starColor = isSelected ? '#64DFFF' : isHovered ? '#8C6CFF' : getStarColor(artist);

        const shouldShowLabel =
          isSelected ||
          isHovered ||
          labelDensity === 'all' ||
          (labelDensity === 'balanced' && artist.prominence > 75);

        return (
          <group
            key={artist.id}
            position={artist.position}
            scale={[currentScale, currentScale, currentScale]}
          >
            {/* 1. Star Core Photosphere (Emissive Standard Material) */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectArtist(artist);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredArtistId(artist.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredArtistId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[baseRadius, 32, 32]} />
              <meshStandardMaterial
                color={starColor}
                emissive={new THREE.Color(starColor)}
                emissiveIntensity={isSelected ? 2.5 : isHovered ? 1.8 : 1.0}
                roughness={0.15}
                metalness={0.9}
              />
            </mesh>

            {/* 2. Pulsating Solar Corona (Custom GLSL Atmospheric Shader) */}
            <mesh>
              <sphereGeometry args={[baseRadius * 1.7, 24, 24]} />
              <primitive object={createStarCoronaMaterial(starColor, baseRadius)} attach="material" />
            </mesh>

            {/* 3. Four-point Diffraction Flare Spikes for High Prominence or Selected Stars */}
            {(isSelected || artist.prominence > 82) && (
              <group>
                {/* Horizontal Spike */}
                <mesh rotation={[0, 0, 0]}>
                  <planeGeometry args={[baseRadius * 6.5, baseRadius * 0.15]} />
                  <meshBasicMaterial
                    color={starColor}
                    transparent
                    opacity={isSelected ? 0.8 : 0.4}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
                {/* Vertical Spike */}
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <planeGeometry args={[baseRadius * 6.5, baseRadius * 0.15]} />
                  <meshBasicMaterial
                    color={starColor}
                    transparent
                    opacity={isSelected ? 0.8 : 0.4}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            )}

            {/* 4. Orbital System Resonance Marker when Selected */}
            {isSelected && (
              <mesh rotation={[Math.PI / 2.8, 0, 0]}>
                <ringGeometry args={[baseRadius * 2.4, baseRadius * 2.5, 48]} />
                <meshBasicMaterial
                  color="#64DFFF"
                  transparent
                  opacity={0.85}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* 5. Accessible Contextual Star Label */}
            {shouldShowLabel && (
              <Html
                position={[0, baseRadius + 1.4, 0]}
                center
                distanceFactor={45}
                zIndexRange={[85, 0]}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectArtist(artist);
                  }}
                  className={`pointer-events-auto cursor-pointer transition-all duration-200 select-none px-2.5 py-1 rounded text-center whitespace-nowrap ${
                    isSelected
                      ? 'bg-accent-cyan/25 border border-accent-cyan text-text-primary shadow-[0_0_15px_rgba(100,223,255,0.5)] backdrop-blur-md text-xs font-bold scale-105'
                      : isHovered
                      ? 'bg-surface-raised/95 border border-accent-violet text-text-primary text-xs backdrop-blur-sm'
                      : 'bg-surface/80 border border-border-subtle text-text-secondary text-[11px] backdrop-blur-xs'
                  }`}
                >
                  <p className="font-sans leading-tight">{artist.name}</p>
                  {artist.genres?.[0] && (
                    <span className="text-[9px] text-text-muted block font-mono mt-0.5">
                      {artist.genres[0]} • {artist.prominence}%
                    </span>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
