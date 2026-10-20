'use client';

import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Artist } from '@/types';

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

  return (
    <group name="artist-stars">
      {artists.map((artist) => {
        if (!artist.position) return null;

        const isSelected = selectedArtistId === artist.id;
        const isHovered = hoveredArtistId === artist.id;

        // Size proportional to prominence (0.7 to 2.4 units)
        const baseRadius = 0.6 + (artist.prominence / 100) * 1.5;
        const currentScale = isSelected ? 1.6 : isHovered ? 1.3 : 1.0;

        // Distinct colors for sources & highlights
        let starColor = '#F3F4F8';
        if (isSelected) starColor = '#64DFFF';
        else if (isHovered) starColor = '#8C6CFF';
        else if (artist.prominence > 80) starColor = '#FFE8D6';

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
            {/* Clickable Star Hit Area & Visual Core */}
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
              <sphereGeometry args={[baseRadius, 16, 16]} />
              <meshStandardMaterial
                color={starColor}
                emissive={starColor}
                emissiveIntensity={isSelected ? 1.8 : isHovered ? 1.2 : 0.6}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>

            {/* Pulsing Corona for Selected or High Prominence Stars */}
            {(isSelected || isHovered) && (
              <mesh>
                <sphereGeometry args={[baseRadius * 1.8, 16, 16]} />
                <meshBasicMaterial
                  color={starColor}
                  transparent
                  opacity={isSelected ? 0.35 : 0.2}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* Orbit Ring Marker when selected */}
            {isSelected && (
              <mesh rotation={[Math.PI / 3, 0, 0]}>
                <ringGeometry args={[baseRadius * 2.2, baseRadius * 2.3, 32]} />
                <meshBasicMaterial
                  color="#64DFFF"
                  transparent
                  opacity={0.8}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Accessible Star Label */}
            {shouldShowLabel && (
              <Html
                position={[0, baseRadius + 1.2, 0]}
                center
                distanceFactor={45}
                zIndexRange={[80, 0]}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectArtist(artist);
                  }}
                  className={`pointer-events-auto cursor-pointer transition-all duration-200 select-none px-2 py-0.5 rounded text-center whitespace-nowrap ${
                    isSelected
                      ? 'bg-accent-cyan/20 border border-accent-cyan text-text-primary shadow-[0_0_12px_rgba(100,223,255,0.4)] backdrop-blur-md text-xs font-semibold'
                      : isHovered
                      ? 'bg-surface-raised/90 border border-accent-violet text-text-primary text-xs backdrop-blur-sm'
                      : 'bg-surface/75 border border-border-subtle text-text-secondary text-[11px] backdrop-blur-xs'
                  }`}
                >
                  <p className="font-sans leading-tight">{artist.name}</p>
                  {artist.genres?.[0] && (
                    <span className="text-[9px] text-text-muted block font-mono">
                      {artist.genres[0]}
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

