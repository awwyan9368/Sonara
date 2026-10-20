'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Artist, Relationship } from '@/types';

interface ConstellationsProps {
  relationships: Relationship[];
  artists: Artist[];
  selectedArtistId: string | null;
  activeJourneyPath: string[]; // List of artist IDs in current journey
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
}

export function Constellations({
  relationships,
  artists,
  selectedArtistId,
  activeJourneyPath,
}: ConstellationsProps) {
  const pulsesRef = useRef<THREE.Points>(null);
  const artistMap = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists]);

  // Standard relationship lines
  const { linePositions, lineColors } = useMemo(() => {
    const pos: number[] = [];
    const cols: number[] = [];

    const baseColor = new THREE.Color('#3A4560');
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

  // Animated journey data packet pulses traveling along the path
  const journeySegments = useMemo(() => {
    if (activeJourneyPath.length < 2) return [];
    const segments: Array<{ from: THREE.Vector3; to: THREE.Vector3 }> = [];

    for (let i = 0; i < activeJourneyPath.length - 1; i++) {
      const a1 = artistMap.get(activeJourneyPath[i]);
      const a2 = artistMap.get(activeJourneyPath[i + 1]);
      if (a1?.position && a2?.position) {
        segments.push({
          from: new THREE.Vector3(...a1.position),
          to: new THREE.Vector3(...a2.position),
        });
      }
    }
    return segments;
  }, [activeJourneyPath, artistMap]);

  useFrame((state) => {
    if (pulsesRef.current && journeySegments.length > 0) {
      const time = state.clock.getElapsedTime();
      const geo = pulsesRef.current.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

      journeySegments.forEach((seg, i) => {
        // Continuous cycle along segment
        const t = (time * 0.8 + (i * 0.3)) % 1.0;
        const currentPos = new THREE.Vector3().lerpVectors(seg.from, seg.to, t);
        posAttr.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);
      });

      posAttr.needsUpdate = true;
    }
  });

  const pulseInitPositions = useMemo(() => {
    const pos = new Float32Array(Math.max(1, journeySegments.length) * 3);
    return pos;
  }, [journeySegments.length]);

  return (
    <group name="constellations-network">
      {/* 1. Base Constellation Lines */}
      {linePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={selectedArtistId ? 0.4 : 0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}

      {/* 2. Radiant Journey Trail Highlight */}
      {journeyPositions && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[journeyPositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color="#E8BC83"
            transparent
            opacity={0.92}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}

      {/* 3. Journey Data Packets Pulsing Along Trail */}
      {journeySegments.length > 0 && (
        <points ref={pulsesRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[pulseInitPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color="#64DFFF"
            size={3.8}
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}
