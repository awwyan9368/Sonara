'use client';

import React, { useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Artist } from '@/types';
import { createStarCoronaMaterial } from '../shaders/starCoronaShader';
import { createPhotosphereMaterial } from '../shaders/photosphereShader';
import { getStarParticleTexture, getCrossSpikeTexture } from '../shaders/particleTextures';

interface ArtistStarsProps {
  artists: Artist[];
  selectedArtistId: string | null;
  onSelectArtist: (artist: Artist) => void;
  labelDensity?: 'minimal' | 'balanced' | 'all';
}

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#D8ECFF', // Dazzling Blue-White Supergiant (~30,000K)
  A: '#FFFFFF', // Pure Brilliant White Luminous Star (~10,000K)
  G: '#FFF5E6', // Warm Solar Daylight Star (~6,000K)
  K: '#FFE2B8', // Warm Amber Giant (~4,500K)
  M: '#FFD29D', // Golden Red Dwarf (~3,500K)
};

function getSpectralClass(prominence: number): 'O' | 'A' | 'G' | 'K' | 'M' {
  if (prominence >= 80) return 'O';
  if (prominence >= 65) return 'A';
  if (prominence >= 50) return 'G';
  if (prominence >= 35) return 'K';
  return 'M';
}

export function ArtistStars({
  artists,
  selectedArtistId,
  onSelectArtist,
  labelDensity = 'balanced',
}: ArtistStarsProps) {
  const [hoveredArtistId, setHoveredArtistId] = useState<string | null>(null);

  // 1. Shared Geometries for GPU optimization
  const sharedGeos = useMemo(() => {
    return {
      core: new THREE.SphereGeometry(1.0, 32, 32),
      corona: new THREE.SphereGeometry(1.22, 28, 28),
      reticle: new THREE.RingGeometry(2.8, 2.84, 48),
      spikePlane: new THREE.PlaneGeometry(3.8, 3.8),
    };
  }, []);

  // 2. Shared Corona Materials keyed by spectral class
  const coronaMaterials = useMemo(() => {
    const map = new Map<'O' | 'A' | 'G' | 'K' | 'M', THREE.ShaderMaterial>();
    (['O', 'A', 'G', 'K', 'M'] as const).forEach((cls) => {
      map.set(cls, createStarCoronaMaterial(SPECTRAL_COLORS[cls], 1.0));
    });
    return map;
  }, []);

  // 3. Shared Dynamic Photosphere Materials with convective boiling granules & limb darkening
  const photosphereMaterials = useMemo(() => {
    const map = new Map<'O' | 'A' | 'G' | 'K' | 'M', THREE.ShaderMaterial>();
    (['O', 'A', 'G', 'K', 'M'] as const).forEach((cls) => {
      map.set(cls, createPhotosphereMaterial(SPECTRAL_COLORS[cls], 80));
    });
    return map;
  }, []);

  // Shared Procedural Textures
  const starGlowTexture = useMemo(() => getStarParticleTexture(), []);
  const crossSpikeTexture = useMemo(() => getCrossSpikeTexture(), []);

  // Shared Diffraction Spike Materials keyed by spectral class
  const spikeMaterials = useMemo(() => {
    const map = new Map<'O' | 'A' | 'G' | 'K' | 'M', THREE.MeshBasicMaterial>();
    (['O', 'A', 'G', 'K', 'M'] as const).forEach((cls) => {
      map.set(
        cls,
        new THREE.MeshBasicMaterial({
          map: crossSpikeTexture,
          color: SPECTRAL_COLORS[cls],
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
    });
    return map;
  }, [crossSpikeTexture]);

  // Update solar convective granules and corona flare animation
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    coronaMaterials.forEach((mat) => {
      if (mat.uniforms?.uTime) {
        mat.uniforms.uTime.value = t;
      }
    });
    photosphereMaterials.forEach((mat) => {
      if (mat.uniforms?.uTime) {
        mat.uniforms.uTime.value = t;
      }
    });
  });

  return (
    <group name="artist-stellar-objects">
      {artists.map((artist) => {
        if (!artist.position) return null;

        const isSelected = selectedArtistId === artist.id;
        const isHovered = hoveredArtistId === artist.id;

        const baseRadius = 0.50 + (artist.prominence / 100) * 0.40;
        const currentScale = (isSelected ? 1.25 : isHovered ? 1.12 : 1.0) * baseRadius;

        const spectralCls = getSpectralClass(artist.prominence);
        const coronaMat = coronaMaterials.get(spectralCls)!;
        const photoMat = photosphereMaterials.get(spectralCls)!;
        const spikeMat = spikeMaterials.get(spectralCls)!;

        const shouldShowLabel =
          isSelected ||
          (!selectedArtistId && (
            isHovered ||
            labelDensity === 'all' ||
            (labelDensity === 'balanced' && artist.prominence > 78)
          ));

        return (
          <group
            key={artist.id}
            position={artist.position}
            scale={[currentScale, currentScale, currentScale]}
          >
            {/* 1. Radiant Stellar Halo Sprite (Bulge Luminosity Billboard facing camera) */}
            <Billboard follow lockX={false} lockY={false} lockZ={false}>
              <mesh position={[0, 0, 0]}>
                <planeGeometry args={[2.8, 2.8]} />
                <meshBasicMaterial
                  map={starGlowTexture}
                  color={SPECTRAL_COLORS[spectralCls]}
                  transparent
                  opacity={isSelected ? 0.85 : 0.60}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </Billboard>

            {/* 2. Star Core Photosphere with Boiling Plasma Granulation & Limb Darkening */}
            <mesh
              geometry={sharedGeos.core}
              material={photoMat}
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
            />

            {/* 3. Pulsating Solar Corona (Solar Prominences & Wind Streamers) */}
            <mesh geometry={sharedGeos.corona} material={coronaMat} />

            {/* 4. Astrophotography Diffraction Starburst Spikes (Always camera-facing) */}
            {(isSelected || artist.prominence > 68) && (
              <Billboard follow lockX={false} lockY={false} lockZ={false}>
                <mesh
                  geometry={sharedGeos.spikePlane}
                  material={spikeMat}
                />
              </Billboard>
            )}

            {/* 5. Physical Stellar Illumination (Only active for the selected artist to preserve 60+ FPS across large libraries) */}
            {isSelected && (
              <pointLight
                color={SPECTRAL_COLORS[spectralCls]}
                intensity={2.4}
                distance={42}
                decay={1.5}
              />
            )}

            {/* 5. Orbital System Resonance Marker when Selected */}
            {isSelected && (
              <mesh geometry={sharedGeos.reticle} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial
                  color="#64DFFF"
                  transparent
                  opacity={0.4}
                  blending={THREE.AdditiveBlending}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* 6. Contextual Star Label */}
            {shouldShowLabel && (
              <Html
                position={[0, 1.8, 0]}
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
