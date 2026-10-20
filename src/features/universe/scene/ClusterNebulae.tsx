'use client';

import React from 'react';
import { TasteCluster } from '@/types';
import { SpiralGalaxy } from './SpiralGalaxy';

interface ClusterNebulaeProps {
  clusters: TasteCluster[];
  selectedClusterId: string | null;
  onSelectCluster: (clusterId: string) => void;
  quality?: 'performance' | 'balanced' | 'high' | 'ultra';
  reducedMotion?: boolean;
}

export function ClusterNebulae({
  clusters,
  selectedClusterId,
  onSelectCluster,
  quality = 'high',
  reducedMotion = false,
}: ClusterNebulaeProps) {
  return (
    <group name="cluster-galaxies">
      {clusters.map((cluster) => (
        <SpiralGalaxy
          key={cluster.id}
          cluster={cluster}
          isSelected={selectedClusterId === cluster.id}
          onSelect={onSelectCluster}
          quality={quality}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}
