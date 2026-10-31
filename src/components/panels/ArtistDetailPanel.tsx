'use client';

import React from 'react';
import { X, Sparkles, Route, Music, ArrowRight, Disc } from 'lucide-react';
import { Artist, Track, Relationship, TasteCluster } from '@/types';

interface ArtistDetailPanelProps {
  artist: Artist | null;
  tracks: Track[];
  relationships: Relationship[];
  allArtists: Artist[];
  clusters: TasteCluster[];
  onClose: () => void;
  onSelectArtist: (artist: Artist) => void;
  onSelectTrack: (track: Track) => void;
  onStartJourney: (startArtist: Artist) => void;
}

export function ArtistDetailPanel({
  artist,
  tracks,
  relationships,
  allArtists,
  clusters,
  onClose,
  onSelectArtist,
  onSelectTrack,
  onStartJourney,
}: ArtistDetailPanelProps) {
  if (!artist) return null;

  const cluster = clusters.find((c) => c.id === artist.clusterId);
  const artistTracks = tracks.filter((t) => (t.artistIds || []).includes(artist.id));

  // Find relationships involving this artist
  const artistMap = new Map(allArtists.map((a) => [a.id, a]));
  const connections = relationships
    .filter((r) => r.sourceId === artist.id || r.targetId === artist.id)
    .map((r) => {
      const otherId = r.sourceId === artist.id ? r.targetId : r.sourceId;
      return {
        otherArtist: artistMap.get(otherId),
        relationship: r,
      };
    })
    .filter((c) => c.otherArtist !== undefined);

  return (
    <aside
      className="fixed top-4 right-4 bottom-4 w-80 md:w-96 bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-2xl p-5 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
      aria-label="Artist Detail Panel"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_8px_#64DFFF]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              Stellar Node
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">{artist.name}</h2>
          {cluster && (
            <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: cluster.color }}
              />
              {cluster.label}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
        {/* Prominence & Stats */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-raised border border-border-subtle">
          <div>
            <span className="text-[10px] font-mono uppercase text-text-muted">Prominence</span>
            <p className="text-lg font-bold font-mono text-accent-cyan">{artist.prominence}%</p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-text-muted">Connections</span>
            <p className="text-lg font-bold font-mono text-accent-amber">{connections.length}</p>
          </div>
        </div>

        {/* Genres */}
        <div>
          <h4 className="text-xs font-mono uppercase text-text-muted mb-2 tracking-wider">
            Harmonic Spectra (Genres)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(artist.genres || []).map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-surface-raised border border-border-subtle text-text-secondary"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* Bio */}
        {artist.bio && (
          <div>
            <h4 className="text-xs font-mono uppercase text-text-muted mb-1.5 tracking-wider">
              Astronomical Provenance
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">{artist.bio}</p>
          </div>
        )}

        {/* Orbiting Planetary Tracks */}
        {artistTracks.length > 0 && (
          <div>
            <h4 className="text-xs font-mono uppercase text-text-muted mb-2 tracking-wider flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-accent-cyan" /> Orbiting Planetary Tracks (
              {artistTracks.length})
            </h4>
            <div className="space-y-1.5">
              {artistTracks.map((track) => (
                <button
                  type="button"
                  key={track.id}
                  onClick={() => onSelectTrack(track)}
                  className="w-full text-left p-2.5 rounded-lg bg-surface-raised/60 hover:bg-surface-raised border border-border-subtle flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: track.planetColor || '#64DFFF' }}
                    />
                    <span className="text-xs font-medium text-text-primary group-hover:text-accent-cyan">
                      {track.title}
                    </span>
                  </div>
                  {track.durationMs && (
                    <span className="text-[10px] font-mono text-text-muted">
                      {Math.floor(track.durationMs / 60000)}:
                      {Math.floor((track.durationMs % 60000) / 1000).toString().padStart(2, '0')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Constellation Relationships */}
        {connections.length > 0 && (
          <div>
            <h4 className="text-xs font-mono uppercase text-text-muted mb-2 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-violet" /> Constellation Neighbors (
              {connections.length})
            </h4>
            <div className="space-y-2">
              {connections.map(({ otherArtist, relationship }) => (
                <div
                  key={relationship.id}
                  onClick={() => otherArtist && onSelectArtist(otherArtist)}
                  className="p-2.5 rounded-lg bg-surface-raised/60 hover:bg-surface-raised border border-border-subtle cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-text-primary group-hover:text-accent-violet">
                      {otherArtist?.name}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-border-subtle text-accent-amber">
                      {relationship.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug line-clamp-2">
                    {relationship.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action: Cosmic Journey */}
      <div className="pt-3 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => onStartJourney(artist)}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-violet to-accent-cyan text-white font-medium text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-[0_0_15px_rgba(140,108,255,0.3)] transition-all cursor-pointer"
        >
          <Route className="w-4 h-4" />
          <span>Launch Cosmic Journey from {artist.name}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}

