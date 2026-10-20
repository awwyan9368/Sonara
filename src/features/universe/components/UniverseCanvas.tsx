'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Artist, TasteCluster, Relationship, Track, UserPreferences } from '@/types';
import { Starfield } from '../scene/Starfield';
import { ClusterNebulae } from '../scene/ClusterNebulae';
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
    if (selectedArtist?.position) {
      const [x, y, z] = selectedArtist.position;
      setCameraTargetPos([x, y + 6, z + 24]);
      setCameraLookAt([x, y, z]);
    } else if (selectedClusterId) {
      const cluster = clusters.find((c) => c.id === selectedClusterId);
      if (cluster) {
        const [cx, cy, cz] = cluster.center;
        setCameraTargetPos([cx, cy + 20, cz + cluster.radius * 1.5]);
        setCameraLookAt([cx, cy, cz]);
      }
    }
  }, [selectedArtist, selectedClusterId, clusters]);

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
        camera={{ position: [0, 35, 110], fov: 50, near: 0.1, far: 800 }}
        gl={{ antialias: preferences.visualQuality !== 'low', alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#05060A']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[50, 100, 50]} intensity={1.2} />
        <pointLight position={[-50, -50, -50]} intensity={0.5} color="#8C6CFF" />

        <Suspense fallback={null}>
          <Starfield
            quality={preferences.visualQuality}
            count={Math.floor(2500 * preferences.particleDensity)}
            reducedMotion={preferences.reducedMotion}
          />

          <ClusterNebulae
            clusters={clusters}
            selectedClusterId={selectedClusterId}
            onSelectCluster={onSelectCluster}
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

