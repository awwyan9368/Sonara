'use client';

import React from 'react';
import { X, ExternalLink, Disc, Music, BarChart2, Radio, Globe } from 'lucide-react';
import { Track, Artist, TasteCluster, Album } from '@/types';

interface TrackDetailPanelProps {
  track: Track | null;
  artist: Artist | null;
  album?: Album | null;
  cluster?: TasteCluster | null;
  onClose: () => void;
  onSelectArtist: (artist: Artist) => void;
}

export function TrackDetailPanel({
  track,
  artist,
  album,
  cluster,
  onClose,
  onSelectArtist,
}: TrackDetailPanelProps) {
  if (!track) return null;

  const spotifyUrl =
    track.externalUrls?.spotify ||
    (track.spotifyUri ? `https://open.spotify.com/track/${track.id.replace('spot_trk_', '')}` : null);

  return (
    <aside
      className="fixed top-4 right-4 bottom-4 w-80 md:w-96 bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-2xl p-5 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
      aria-label="Track Detail Panel"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px]"
              style={{
                backgroundColor: track.planetColor || '#64DFFF',
                boxShadow: `0 0 8px ${track.planetColor || '#64DFFF'}`,
              }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              Planetary Track Entity
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-text-primary truncate">{track.title}</h2>
          {artist && (
            <button
              type="button"
              onClick={() => onSelectArtist(artist)}
              className="text-xs text-accent-cyan hover:underline mt-0.5 truncate text-left block"
            >
              by {artist.name}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
        {/* Parent Genre Galaxy Badge */}
        {cluster && (
          <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">Parent Galaxy Domain</span>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: cluster.color, boxShadow: `0 0 8px ${cluster.color}` }}
              />
              <span className="text-xs font-semibold text-text-primary">{cluster.label}</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-snug">{cluster.description}</p>
          </div>
        )}

        {/* Listening Frequency Metrics (Part 3) */}
        <div className="p-3.5 rounded-xl bg-surface-raised border border-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-accent-cyan" /> User Listening Frequency
            </span>
            <span
              className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                track.isFrequencyAvailable
                  ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                  : 'bg-surface border-border-subtle text-text-muted'
              }`}
            >
              {track.isFrequencyAvailable ? 'Verified Plays' : 'Unavailable'}
            </span>
          </div>

          {track.isFrequencyAvailable ? (
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-accent-cyan">{track.playCount}</span>
                <span className="text-xs text-text-secondary font-mono">recent plays recorded</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Determines visual planetary volume ({track.planetSize?.toFixed(2)}x standard celestial radius).
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-medium text-text-secondary">Neutral Default Radius (0.70x)</p>
              <p className="text-[10px] text-text-muted leading-relaxed">
                Spotify Web API does not provide lifetime play-counts for individual catalog songs. Frequency is
                strictly marked unavailable rather than fabricated.
              </p>
            </div>
          )}
        </div>

        {/* Global Spotify Popularity vs Personal Plays */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle">
            <span className="text-[10px] font-mono uppercase text-text-muted block mb-0.5">Global Popularity</span>
            <span className="text-lg font-bold font-mono text-accent-amber">{track.popularity || 0}/100</span>
            <span className="text-[9px] text-text-muted block mt-0.5">Spotify Catalog Metric</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle">
            <span className="text-[10px] font-mono uppercase text-text-muted block mb-0.5">Ring System</span>
            <span className="text-lg font-bold font-mono text-text-primary">
              {track.hasRings ? 'Present' : 'None'}
            </span>
            <span className="text-[9px] text-text-muted block mt-0.5">
              {track.hasRings ? 'High popularity release' : 'Standard orbital sphere'}
            </span>
          </div>
        </div>

        {/* Album & Duration Info */}
        <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle space-y-2">
          <span className="text-[10px] font-mono uppercase text-text-muted flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-accent-violet" /> Album & Metadata
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-primary">{album?.title || 'Single / Release'}</p>
            {album?.releaseYear && (
              <p className="text-[11px] text-text-muted font-mono">Released: {album.releaseYear}</p>
            )}
            {track.durationMs && (
              <p className="text-[11px] text-text-muted font-mono">
                Duration: {Math.floor(track.durationMs / 60000)}m{' '}
                {Math.floor((track.durationMs % 60000) / 1000)}s
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Open in Spotify */}
      {spotifyUrl && (
        <div className="pt-3 border-t border-border-subtle">
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(29,185,84,0.3)] cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Track in Spotify</span>
          </a>
        </div>
      )}
    </aside>
  );
}

