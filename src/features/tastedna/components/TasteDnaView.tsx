'use client';

import React, { useMemo, useState } from 'react';
import {
  Dna,
  Compass,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Share2,
  Info,
} from 'lucide-react';
import { Artist, Track, Relationship, TasteCluster } from '@/types';
import { analyzeTasteDna } from '../algorithms/tasteEngine';

interface TasteDnaViewProps {
  artists: Artist[];
  tracks: Track[];
  relationships: Relationship[];
  clusters: TasteCluster[];
  onFocusClusterInUniverse: (clusterId: string) => void;
  onSelectArtist: (artist: Artist) => void;
}

export function TasteDnaView({
  artists,
  tracks,
  relationships,
  clusters,
  onFocusClusterInUniverse,
  onSelectArtist,
}: TasteDnaViewProps) {
  const analysis = useMemo(
    () => analyzeTasteDna(artists, tracks, relationships, clusters),
    [artists, tracks, relationships, clusters]
  );

  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(
    clusters[0]?.id || null
  );

  const activeCluster = clusters.find((c) => c.id === selectedClusterId);
  const activeClusterBreakdown = analysis.clusterBreakdowns.find(
    (b) => b.clusterId === selectedClusterId
  );

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-10 bg-background text-text-primary">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Title Header */}
        <header className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent-cyan mb-2">
              <Dna className="w-5 h-5" />
              <span className="text-xs font-mono uppercase tracking-widest">
                Music Intelligence & Taste Dynamics
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">TasteDNA Profile</h1>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Calculated from multi-signal graph topology, harmonic spectra, and relational clustering.
              All insights are derived strictly from active library entities.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-text-muted bg-surface-raised px-3 py-1.5 rounded-lg border border-border-subtle shrink-0">
            <span>Algorithm: {analysis.snapshot.algorithmVersion}</span>
          </div>
        </header>

        {/* Library Composition Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
            <span className="text-xs font-mono uppercase text-text-muted">Total Artists</span>
            <p className="text-2xl font-bold font-mono text-text-primary">
              {analysis.snapshot.computedMetrics.totalArtists}
            </p>
            <span className="text-[10px] text-text-muted">Catalog celestial nodes</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
            <span className="text-xs font-mono uppercase text-text-muted">Catalog Tracks</span>
            <p className="text-2xl font-bold font-mono text-accent-cyan">
              {analysis.snapshot.computedMetrics.totalTracks}
            </p>
            <span className="text-[10px] text-text-muted">Orbiting planetary bodies</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
            <span className="text-xs font-mono uppercase text-text-muted">Discrete Genres</span>
            <p className="text-2xl font-bold font-mono text-accent-violet">
              {analysis.snapshot.computedMetrics.totalGenres}
            </p>
            <span className="text-[10px] text-text-muted">Unique musical spectra</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1">
            <span className="text-xs font-mono uppercase text-text-muted flex items-center justify-between">
              Diversity Index
              <span className="text-[9px] text-accent-amber" title="Simpson's reciprocal diversity score: 1 - sum(p_i^2)">
                [0-1]
              </span>
            </span>
            <p className="text-2xl font-bold font-mono text-accent-amber">
              {analysis.snapshot.computedMetrics.diversityScore}
            </p>
            <span className="text-[10px] text-text-muted">Normalized genre dispersion</span>
          </div>
        </div>

        {/* Clusters Breakdown Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-accent-cyan" />
              Harmonic Taste Clusters
            </h2>
            <span className="text-xs font-mono text-text-muted">
              {clusters.length} Galactic Neighborhoods
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.clusterBreakdowns.map((cluster) => {
              const isSelected = selectedClusterId === cluster.clusterId;

              return (
                <div
                  key={cluster.clusterId}
                  onClick={() => setSelectedClusterId(cluster.clusterId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-surface-raised border-accent-cyan shadow-[0_0_20px_rgba(100,223,255,0.15)]'
                      : 'bg-surface border-border-subtle hover:bg-surface-raised/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cluster.color, boxShadow: `0 0 8px ${cluster.color}` }}
                    />
                    <span className="text-xs font-mono font-bold text-accent-cyan">
                      {cluster.percentage}%
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-text-primary mb-1">{cluster.label}</h3>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {cluster.dominantGenres.slice(0, 2).map((g) => (
                      <span
                        key={g}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border-subtle text-text-muted"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface h-1.5 rounded-full mt-4 overflow-hidden border border-border-subtle">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cluster.percentage}%`,
                        backgroundColor: cluster.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Selected Cluster Detail & Action */}
        {activeCluster && activeClusterBreakdown && (
          <div className="p-6 rounded-2xl bg-surface border border-accent-cyan/30 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-accent-cyan block mb-1">
                  Active Cluster Focus
                </span>
                <h3 className="text-xl font-bold text-text-primary">{activeCluster.label}</h3>
                <p className="text-xs text-text-secondary mt-1">{activeCluster.description}</p>
              </div>

              <button
                type="button"
                onClick={() => onFocusClusterInUniverse(activeCluster.id)}
                className="py-2.5 px-4 rounded-xl bg-accent-cyan text-background font-semibold text-xs flex items-center gap-2 hover:bg-accent-cyan/90 transition-all shrink-0 cursor-pointer shadow-[0_0_12px_rgba(100,223,255,0.4)]"
              >
                <span>Navigate Universe to this Cluster</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 border-t border-border-subtle">
              <span className="text-xs font-mono text-text-muted uppercase block mb-2">
                Member Artists in this Harmonic Neighborhood
              </span>
              <div className="flex flex-wrap gap-2">
                {activeClusterBreakdown.topArtists.map((artist) => (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => onSelectArtist(artist)}
                    className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs font-medium text-text-primary hover:text-accent-cyan flex items-center gap-1.5 transition-colors"
                  >
                    <span>{artist.name}</span>
                    <span className="text-[10px] font-mono text-accent-amber">
                      {artist.prominence}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bridge Artists & Discovery Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bridge Artists */}
          <section className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-accent-violet" />
              <div>
                <h3 className="font-bold text-base text-text-primary">Galactic Bridge Artists</h3>
                <p className="text-xs text-text-muted">
                  Artists connecting multiple distinct taste clusters through collaborations
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {analysis.bridgeArtists.map((bridge) => (
                <div
                  key={bridge.artistId}
                  className="p-3 rounded-xl bg-surface-raised border border-border-subtle space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary">{bridge.artistName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface text-accent-violet border border-border-subtle">
                      Spans {bridge.connectsClusters.length} Clusters
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {bridge.explanation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Discovery Suggestions */}
          <section className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-amber" />
              <div>
                <h3 className="font-bold text-base text-text-primary">Cosmic Discovery Paths</h3>
                <p className="text-xs text-text-muted">
                  Suggested artists with mathematically verified affinity to your catalog
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {analysis.discoverySuggestions.map((rec) => (
                <div
                  key={rec.artist.id}
                  onClick={() => onSelectArtist(rec.artist)}
                  className="p-3 rounded-xl bg-surface-raised border border-border-subtle hover:border-accent-amber/50 transition-colors cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary group-hover:text-accent-amber">
                      {rec.artist.name}
                    </span>
                    <span className="text-[10px] font-mono text-accent-amber">
                      {Math.round(rec.affinityScore * 100)}% Affinity
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-snug">
                    {rec.recommendedBecause}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Dominant Genres Distribution */}
        <section className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-cyan" />
            Dominant Spectral Genres Distribution
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {analysis.topGenres.map((genre) => (
              <div
                key={genre.name}
                className="p-3 rounded-xl bg-surface-raised border border-border-subtle space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">{genre.name}</span>
                  <span className="text-xs font-mono font-bold text-accent-cyan">
                    {genre.percentage}%
                  </span>
                </div>
                <div className="w-full bg-surface h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-cyan rounded-full"
                    style={{ width: `${Math.min(100, genre.percentage * 2.5)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-text-muted">
                  {genre.count} artist occurrences
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

