'use client';

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TasteCluster } from '@/types';

interface ClusterNebulaeProps {
  clusters: TasteCluster[];
  selectedClusterId: string | null;
  onSelectCluster: (clusterId: string) => void;
  reducedMotion?: boolean;
}

export function ClusterNebulae({
  clusters,
  selectedClusterId,
  onSelectCluster,
}: ClusterNebulaeProps) {
  return (
    <group name="cluster-nebulae">
      {clusters.map((cluster) => {
        const isSelected = selectedClusterId === cluster.id;
        const color = new THREE.Color(cluster.color);

        return (
          <group key={cluster.id} position={cluster.center}>
            {/* Subtle luminous volumetric haze */}
            <mesh>
              <sphereGeometry args={[cluster.radius * 0.9, 16, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSelected ? 0.08 : 0.035}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.BackSide}
              />
            </mesh>

            {/* Inner core glow */}
            <mesh>
              <sphereGeometry args={[cluster.radius * 0.45, 12, 12]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSelected ? 0.12 : 0.05}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* Subtle orbital boundary ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[cluster.radius * 0.98, cluster.radius * 1.02, 48]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSelected ? 0.35 : 0.08}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Interactive Cluster Label */}
            <Html
              position={[0, cluster.radius * 0.85, 0]}
              center
              distanceFactor={80}
              zIndexRange={[100, 0]}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCluster(cluster.id);
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-md cursor-pointer select-none ${
                  isSelected
                    ? 'bg-surface-raised/90 border-accent-cyan shadow-[0_0_15px_rgba(100,223,255,0.4)] text-text-primary scale-105'
                    : 'bg-surface/60 border-border-subtle hover:border-text-secondary/50 text-text-secondary hover:text-text-primary'
                }`}
                aria-label={`Select taste cluster ${cluster.label}`}
              >
                <span
                  className="w-2 h-2 rounded-full transition-transform group-hover:scale-125"
                  style={{ backgroundColor: cluster.color, boxShadow: `0 0 8px ${cluster.color}` }}
                />
                <span className="text-xs font-medium tracking-wide uppercase font-mono">
                  {cluster.label}
                </span>
                <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-full bg-surface-raised border border-border-subtle">
                  {cluster.memberArtistIds.length}
                </span>
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

