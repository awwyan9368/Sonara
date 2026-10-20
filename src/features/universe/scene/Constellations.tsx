'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Artist, Relationship } from '@/types';

interface ConstellationsProps {
  relationships: Relationship[];
  artists: Artist[];
  selectedArtistId: string | null;
  activeJourneyPath: string[]; // List of artist IDs in current journey
  quality?: 'low' | 'medium' | 'high';
}

export function Constellations({
  relationships,
  artists,
  selectedArtistId,
  activeJourneyPath,
}: ConstellationsProps) {
  const artistMap = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists]);

  // Standard relationship lines
  const { linePositions, lineColors } = useMemo(() => {
    const pos: number[] = [];
    const cols: number[] = [];

    const baseColor = new THREE.Color('#4E5975');
    const highlightedColor = new THREE.Color('#64DFFF');
    const directColor = new THREE.Color('#8C6CFF');

    for (const rel of relationships) {
      const a1 = artistMap.get(rel.sourceId);
      const a2 = artistMap.get(rel.targetId);
      if (!a1?.position || !a2?.position) continue;

      const isConnectedToSelected =
        selectedArtistId && (rel.sourceId === selectedArtistId || rel.targetId === selectedArtistId);

      const color = isConnectedToSelected ? directColor : baseColor;

      pos.push(a1.position[0], a1.position[1], a1.position[2]);
      pos.push(a2.position[0], a2.position[1], a2.position[2]);

      cols.push(color.r, color.g, color.b);
      cols.push(color.r, color.g, color.b);
    }

    return {
      linePositions: new Float32Array(pos),
      lineColors: new Float32Array(cols),
    };
  }, [relationships, artistMap, selectedArtistId]);

  // Active Journey path highlight lines
  const journeyPositions = useMemo(() => {
    if (activeJourneyPath.length < 2) return null;
    const pos: number[] = [];

    for (let i = 0; i < activeJourneyPath.length - 1; i++) {
      const a1 = artistMap.get(activeJourneyPath[i]);
      const a2 = artistMap.get(activeJourneyPath[i + 1]);
      if (a1?.position && a2?.position) {
        pos.push(a1.position[0], a1.position[1], a1.position[2]);
        pos.push(a2.position[0], a2.position[1], a2.position[2]);
      }
    }

    return pos.length > 0 ? new Float32Array(pos) : null;
  }, [activeJourneyPath, artistMap]);

  return (
    <group name="constellations">
      {/* Base network constellation lines */}
      {linePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[linePositions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[lineColors, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={selectedArtistId ? 0.35 : 0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}

      {/* Radiant Journey Path Discovery Trail */}
      {journeyPositions && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[journeyPositions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#E8BC83"
            linewidth={3}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}
    </group>
  );
}

