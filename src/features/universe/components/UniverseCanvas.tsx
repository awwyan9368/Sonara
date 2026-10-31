'use client';

import React, { useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Artist, TasteCluster, Relationship, Track, UserPreferences } from '@/types';
import { Starfield } from '../scene/Starfield';
import { MasterSpiralGalaxy } from '../scene/MasterSpiralGalaxy';
import { ClusterNebulae } from '../scene/ClusterNebulae';
import { VolumetricNebulae } from '../scene/VolumetricNebulae';
import { Constellations } from '../scene/Constellations';
import { ArtistStars } from '../scene/ArtistStars';
import { TrackPlanets } from '../scene/TrackPlanets';
import { CameraController } from '../camera/CameraController';
import { UniverseFallback } from './UniverseFallback';

interface UniverseCanvasProps {
  artists: Artist[];
  clusters: TasteCluster[];
  relationships: Relationship[];
  tracks: Track[];
  selectedArtist: Artist | null;
  selectedClusterId: string | null;
  selectedTrackId: string | null;
  activeJourneyPath: string[];
  preferences: UserPreferences;
  resetCameraTrigger: number;
  onSelectArtist: (artist: Artist) => void;
  onSelectCluster: (clusterId: string) => void;
  onSelectTrack: (track: Track) => void;
}

export function UniverseCanvas({
  artists,
  clusters,
  relationships,
  tracks,
  selectedArtist,
  selectedClusterId,
  selectedTrackId,
  activeJourneyPath,
  preferences,
  resetCameraTrigger,
  onSelectArtist,
  onSelectCluster,
  onSelectTrack,
}: UniverseCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  // Check WebGL availability safely on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setHasWebGL(Boolean(gl));
    } catch {
      setHasWebGL(false);
    }
  }, []);

  // Compute camera target when an artist or cluster is selected
  const [cameraTargetPos, setCameraTargetPos] = useState<[number, number, number] | null>(null);
  const [cameraLookAt, setCameraLookAt] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    if (selectedTrackId) {
      const track = tracks.find((t) => t.id === selectedTrackId);
      if (track) {
        let px = 0, py = 0, pz = 0;
        const parentArtist = artists.find((a) => track.artistIds?.includes(a.id));
        const [ax, ay, az] = parentArtist?.position || [0, 0, 0];
        const artistTracks = tracks.filter((t) => t.artistIds?.includes(parentArtist?.id || ''));
        const trackIdx = artistTracks.findIndex((t) => t.id === track.id);
        const radius = track.orbitRadius || 3.8 + (Math.max(0, trackIdx) % 6) * 2.2;
        const initialAngle = ((Math.max(0, trackIdx) % 6) / 6) * Math.PI * 2;

        if (track.position) {
          [px, py, pz] = track.position;
        } else {
          px = ax + Math.cos(initialAngle) * radius;
          py = ay + Math.sin(initialAngle * 3.0) * 0.15;
          pz = az + Math.sin(initialAngle) * radius;
        }

        // Optimal distance for full-frame cinematic framing of the planet
        const planetScale = track.planetSize || 0.85;
        const camDist = (track.hasRings ? 4.2 : 3.4) * planetScale;

        // Compute radial and tangential vectors relative to central star
        const dx = px - ax;
        const dz = pz - az;
        const radDist = Math.hypot(dx, dz) || 1.0;
        const ux = dx / radDist; // unit radial vector (star -> planet)
        const uz = dz / radDist;
        const tx = -uz;          // unit tangent vector along orbit
        const tz = ux;

        // Position camera: along orbit tangent + outward (+ux) + slight vertical elevation (+y)
        // 1. Radially outward ensures camera distance to star is ALWAYS > radDist (never clips inside star)
        // 2. Star is safely ~66° off-screen, eliminating billboard blowout
        // 3. Starlight illuminates planet from oblique angle, yielding 3/4 crescent/terminator shading
        // 4. Line of sight looks into deep dark starry space
        const camX = px + (tx * 0.82 + ux * 0.40) * camDist;
        const camY = py + 0.35 * camDist;
        const camZ = pz + (tz * 0.82 + uz * 0.40) * camDist;

        setCameraTargetPos([camX, camY, camZ]);
        setCameraLookAt([px, py, pz]);
        return;
      }
    }

    if (selectedArtist?.position) {
      const [x, y, z] = selectedArtist.position;
      // Elegant framing showcasing the artist star and its revolving planetary system
      setCameraTargetPos([x + 7.5, y + 5.0, z + 15.0]);
      setCameraLookAt([x, y, z]);
    } else if (selectedClusterId) {
      const cluster = clusters.find((c) => c.id === selectedClusterId);
      if (cluster) {
        const [cx, cy, cz] = cluster.center;
        setCameraTargetPos([cx, cy + 20, cz + cluster.radius * 1.5]);
        setCameraLookAt([cx, cy, cz]);
      }
    }
  }, [selectedTrackId, selectedArtist, selectedClusterId, clusters, tracks, artists]);

  // If user explicitly chose accessible list mode or WebGL is unsupported
  if (preferences.explorationMode === 'accessible_list' || hasWebGL === false) {
    return (
      <UniverseFallback
        artists={artists}
        clusters={clusters}
        selectedArtist={selectedArtist}
        onSelectArtist={onSelectArtist}
        onSelectCluster={onSelectCluster}
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-[#05060A] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 85, 145], fov: 48, near: 0.1, far: 1200 }}
        gl={{
          antialias: preferences.visualQuality !== 'performance',
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={['#030408']} />
        <fog attach="fog" args={['#030408', 240, 850]} />
        <ambientLight intensity={0.16} />
        <directionalLight position={[60, 80, 50]} intensity={1.35} color="#FFF8F0" />
        <pointLight position={[-40, -40, -40]} intensity={0.4} color="#8C6CFF" />

        <Suspense fallback={null}>
          <Starfield
            quality={preferences.visualQuality}
            count={Math.floor(3500 * preferences.particleDensity)}
            reducedMotion={preferences.reducedMotion}
          />

          <MasterSpiralGalaxy
            clusters={clusters}
            quality={preferences.visualQuality}
            reducedMotion={preferences.reducedMotion}
          />

          <ClusterNebulae
            clusters={clusters}
            selectedClusterId={selectedClusterId}
            onSelectCluster={onSelectCluster}
            quality={preferences.visualQuality}
            reducedMotion={preferences.reducedMotion}
          />

          <VolumetricNebulae
            clusters={clusters}
            selectedClusterId={selectedClusterId}
            quality={preferences.visualQuality}
            reducedMotion={preferences.reducedMotion}
          />

          <Constellations
            relationships={relationships}
            artists={artists}
            selectedArtistId={selectedArtist?.id || null}
            activeJourneyPath={activeJourneyPath}
            quality={preferences.visualQuality}
          />

          <ArtistStars
            artists={artists}
            selectedArtistId={selectedArtist?.id || null}
            onSelectArtist={onSelectArtist}
            labelDensity={preferences.labelDensity}
          />

          <TrackPlanets
            tracks={tracks}
            artists={artists}
            selectedArtist={selectedArtist}
            selectedTrackId={selectedTrackId}
            onSelectTrack={onSelectTrack}
            reducedMotion={preferences.reducedMotion}
          />

          <CameraController
            targetPosition={cameraTargetPos}
            targetLookAt={cameraLookAt}
            resetTrigger={resetCameraTrigger}
            sensitivity={preferences.cameraSensitivity}
            reducedMotion={preferences.reducedMotion}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

