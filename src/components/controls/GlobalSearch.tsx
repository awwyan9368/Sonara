'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Disc, Compass, Music } from 'lucide-react';
import { Artist, Track, Album, TasteCluster } from '@/types';

interface GlobalSearchProps {
  artists: Artist[];
  tracks: Track[];
  albums: Album[];
  clusters: TasteCluster[];
  onSelectArtist: (artist: Artist) => void;
  onSelectTrack: (track: Track) => void;
  onSelectCluster: (clusterId: string) => void;
}

export function GlobalSearch({
  artists,
  tracks,
  albums,
  clusters,
  onSelectArtist,
  onSelectTrack,
  onSelectCluster,
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Shortcut listener for Ctrl+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const q = query.toLowerCase().trim();

  const matchedArtists = q
    ? artists.filter(
        (a) => a.name.toLowerCase().includes(q) || a.genres.some((g) => g.toLowerCase().includes(q))
      ).slice(0, 5)
    : [];

  const matchedTracks = q
    ? tracks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 4)
    : [];

  const matchedClusters = q
    ? clusters.filter(
        (c) => c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const totalResults = matchedArtists.length + matchedTracks.length + matchedClusters.length;

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/75 border border-border-subtle hover:border-accent-cyan/50 text-text-secondary hover:text-text-primary backdrop-blur-md transition-all shadow-sm group"
        aria-label="Search astronomical catalog"
      >
        <Search className="w-3.5 h-3.5 text-accent-cyan group-hover:scale-110 transition-transform" />
        <span className="text-xs font-mono">Search catalog...</span>
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border-subtle text-text-muted">
          /
        </kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-surface border border-border-subtle shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-border-subtle gap-3">
              <Search className="w-5 h-5 text-accent-cyan shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search artists, tracks, genres, clusters..."
                className="w-full bg-transparent text-text-primary placeholder:text-text-muted text-sm focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border-subtle text-text-muted">
                ESC
              </kbd>
            </div>

            {/* Results Container */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
              {q && totalResults === 0 && (
                <div className="py-12 text-center text-text-muted text-sm">
                  No astronomical entities found matching &quot;{query}&quot;.
                </div>
              )}

              {!q && (
                <div className="py-8 text-center text-text-muted text-xs">
                  Type to explore artists, musical clusters, or tracks in the universe.
                </div>
              )}

              {/* Matched Artists */}
              {matchedArtists.length > 0 && (
                <div>
                  <h4 className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-cyan" /> Artists ({matchedArtists.length})
                  </h4>
                  <div className="space-y-1">
                    {matchedArtists.map((artist) => (
                      <button
                        type="button"
                        key={artist.id}
                        onClick={() => {
                          onSelectArtist(artist);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-raised flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary group-hover:text-accent-cyan">
                            {artist.name}
                          </p>
                          <p className="text-xs text-text-muted font-mono">
                            {artist.genres.slice(0, 3).join(' • ')}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border-subtle text-accent-amber">
                          {artist.prominence}% Prominence
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Clusters */}
              {matchedClusters.length > 0 && (
                <div>
                  <h4 className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-accent-violet" /> Harmonic Clusters ({matchedClusters.length})
                  </h4>
                  <div className="space-y-1">
                    {matchedClusters.map((cluster) => (
                      <button
                        type="button"
                        key={cluster.id}
                        onClick={() => {
                          onSelectCluster(cluster.id);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-raised flex items-center gap-3 group transition-colors"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cluster.color, boxShadow: `0 0 8px ${cluster.color}` }}
                        />
                        <div>
                          <p className="text-sm font-medium text-text-primary group-hover:text-accent-violet">
                            {cluster.label}
                          </p>
                          <p className="text-xs text-text-muted line-clamp-1">
                            {cluster.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Tracks */}
              {matchedTracks.length > 0 && (
                <div>
                  <h4 className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Disc className="w-3.5 h-3.5 text-accent-amber" /> Tracks ({matchedTracks.length})
                  </h4>
                  <div className="space-y-1">
                    {matchedTracks.map((track) => (
                      <button
                        type="button"
                        key={track.id}
                        onClick={() => {
                          onSelectTrack(track);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-raised flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-text-muted group-hover:text-accent-amber" />
                          <p className="text-sm font-medium text-text-primary group-hover:text-accent-amber">
                            {track.title}
                          </p>
                        </div>
                        {track.durationMs && (
                          <span className="text-xs font-mono text-text-muted">
                            {Math.floor(track.durationMs / 60000)}:
                            {Math.floor((track.durationMs % 60000) / 1000).toString().padStart(2, '0')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

