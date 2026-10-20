'use client';

import React from 'react';
import { Artist, TasteCluster } from '@/types';
import { Sparkles, Compass, Radio } from 'lucide-react';

interface UniverseFallbackProps {
  artists: Artist[];
  clusters: TasteCluster[];
  selectedArtist: Artist | null;
  onSelectArtist: (artist: Artist) => void;
  onSelectCluster: (clusterId: string) => void;
}

export function UniverseFallback({
  artists,
  clusters,
  selectedArtist,
  onSelectArtist,
  onSelectCluster,
}: UniverseFallbackProps) {
  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-10 bg-background text-text-primary">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="border-b border-border-subtle pb-6">
          <div className="flex items-center gap-2 text-accent-cyan mb-2">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest">
              Astronomical Spectral Index (Accessible Fallback)
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">SoundGalaxy Direct Catalog</h2>
          <p className="text-sm text-text-secondary mt-1">
            Navigable two-dimensional topological catalog for systems without WebGL acceleration or for accessible low-motion exploration.
          </p>
        </header>

        {/* Clusters grid */}
        <section className="space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent-amber" /> Harmonic Clusters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster) => {
              const memberArtists = artists.filter(
                (a) => a.clusterId === cluster.id || cluster.memberArtistIds.includes(a.id)
              );

              return (
                <div
                  key={cluster.id}
                  onClick={() => onSelectCluster(cluster.id)}
                  className="p-4 rounded-xl border border-border-subtle bg-surface hover:bg-surface-raised transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cluster.color, boxShadow: `0 0 10px ${cluster.color}` }}
                    />
                    <span className="text-xs font-mono text-text-muted">
                      {memberArtists.length} Entities
                    </span>
                  </div>
                  <h4 className="font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
                    {cluster.label}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                    {cluster.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Artists list */}
        <section className="space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-violet" /> Artist Constellation Nodes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {artists.map((artist) => {
              const isSelected = selectedArtist?.id === artist.id;
              return (
                <button
                  type="button"
                  key={artist.id}
                  onClick={() => onSelectArtist(artist)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-accent-cyan bg-accent-cyan/10 shadow-[0_0_12px_rgba(100,223,255,0.3)]'
                      : 'border-border-subtle bg-surface hover:border-text-secondary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-text-primary">{artist.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised text-accent-amber">
                      {artist.prominence}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {artist.genres.slice(0, 2).map((g) => (
                      <span
                        key={g}
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-text-muted"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

