'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Route, Play, Save, Check, AlertCircle, ArrowRight, X, Sparkles, Navigation } from 'lucide-react';
import { Artist, Relationship, Journey, JourneyStepExplanation } from '@/types';
import { MusicGraph } from '@/lib/graph/pathfinding';
import { db } from '@/lib/storage/db';

interface CosmicJourneyPanelProps {
  artists: Artist[];
  relationships: Relationship[];
  initialStartArtist: Artist | null;
  onClose: () => void;
  onNavigateToArtist: (artist: Artist) => void;
  onUpdateJourneyPath: (path: string[]) => void;
  onJourneySaved?: (journey: Journey) => void;
}

export function CosmicJourneyPanel({
  artists,
  relationships,
  initialStartArtist,
  onClose,
  onNavigateToArtist,
  onUpdateJourneyPath,
  onJourneySaved,
}: CosmicJourneyPanelProps) {
  const graph = useMemo(() => new MusicGraph(relationships), [relationships]);
  const artistMap = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists]);

  const [startId, setStartId] = useState<string>(initialStartArtist?.id || artists[0]?.id || '');
  const [destId, setDestId] = useState<string>(artists[5]?.id || artists[1]?.id || '');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [journeyTitle, setJourneyTitle] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Compute graph path
  const pathResult = useMemo(() => {
    if (!startId || !destId) return null;
    return graph.findOptimalAffinityPath(startId, destId);
  }, [graph, startId, destId]);

  // Sync universe active journey path
  useEffect(() => {
    if (pathResult?.found) {
      onUpdateJourneyPath(pathResult.path);
    } else {
      onUpdateJourneyPath([]);
    }
  }, [pathResult, onUpdateJourneyPath]);

  // Default title
  useEffect(() => {
    const a1 = artistMap.get(startId)?.name || 'Start';
    const a2 = artistMap.get(destId)?.name || 'Dest';
    setJourneyTitle(`Cosmic Passage: ${a1} -> ${a2}`);
    setIsSaved(false);
    setActiveStepIndex(0);
  }, [startId, destId, artistMap]);

  const handleStepClick = (index: number, artistId: string) => {
    setActiveStepIndex(index);
    const artist = artistMap.get(artistId);
    if (artist) {
      onNavigateToArtist(artist);
    }
  };

  const handleSaveJourney = async () => {
    if (!pathResult?.found || !startId || !destId) return;

    const journey: Journey = {
      id: `journey_${Date.now()}`,
      startArtistId: startId,
      destinationArtistId: destId,
      orderedPath: pathResult.path,
      relationshipExplanations: pathResult.explanations,
      createdAt: new Date().toISOString(),
      title: journeyTitle.trim() || `Passage: ${artistMap.get(startId)?.name} to ${artistMap.get(destId)?.name}`,
    };

    try {
      await db.journeys.put(journey);
      setIsSaved(true);
      if (onJourneySaved) onJourneySaved(journey);
    } catch (e) {
      console.error('Failed to save journey to IndexedDB:', e);
    }
  };

  return (
    <div
      className="fixed top-4 left-20 md:left-24 bottom-4 w-88 md:w-96 bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-2xl p-5 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300"
      aria-label="Cosmic Journey Navigation"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Route className="w-4 h-4 text-accent-cyan" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              Signature Discovery Engine
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Cosmic Journey</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          aria-label="Close Journey Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selectors for Start and Destination */}
      <div className="py-4 space-y-3 border-b border-border-subtle">
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
            Origin Star (Departure)
          </label>
          <select
            value={startId}
            onChange={(e) => setStartId(e.target.value)}
            className="w-full bg-surface-raised border border-border-subtle text-text-primary text-xs rounded-lg p-2 focus:outline-none focus:border-accent-cyan"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.genres[0] || 'Unknown'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted block mb-1">
            Destination Star (Target)
          </label>
          <select
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            className="w-full bg-surface-raised border border-border-subtle text-text-primary text-xs rounded-lg p-2 focus:outline-none focus:border-accent-violet"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.genres[0] || 'Unknown'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Path Results & Step-by-Step Waypoints */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {!pathResult?.found ? (
          <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-accent-amber mx-auto" />
            <h4 className="text-xs font-semibold text-text-primary">No Graph Route Detected</h4>
            <p className="text-[11px] text-text-muted">
              {pathResult?.reason || 'These two entities reside in disconnected galactic clusters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-muted">
                Waypoints: {pathResult.path.length} stars ({pathResult.path.length - 1} hops)
              </span>
              <span className="text-[10px] font-mono text-accent-cyan">
                Dijkstra Optimal Affinity
              </span>
            </div>

            {/* Stepper list */}
            <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border-subtle">
              {pathResult.path.map((artistId, idx) => {
                const artist = artistMap.get(artistId);
                const isCurrent = idx === activeStepIndex;
                const explanation =
                  idx > 0 ? pathResult.explanations[idx - 1] : null;

                return (
                  <div key={artistId} className="relative pl-8">
                    {/* Stepper Node Circle */}
                    <div
                      onClick={() => handleStepClick(idx, artistId)}
                      className={`absolute left-1.5 top-2 w-4 h-4 rounded-full border-2 transition-transform cursor-pointer -translate-x-1/2 flex items-center justify-center ${
                        isCurrent
                          ? 'border-accent-cyan bg-background scale-125 shadow-[0_0_8px_#64DFFF]'
                          : 'border-border-subtle bg-surface-raised'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                    </div>

                    {/* Step Card */}
                    <div
                      onClick={() => handleStepClick(idx, artistId)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-surface-raised border-accent-cyan shadow-md'
                          : 'bg-surface/50 border-border-subtle hover:bg-surface-raised/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">
                          {idx + 1}. {artist?.name}
                        </span>
                        <Navigation className="w-3 h-3 text-text-muted" />
                      </div>

                      {artist?.genres[0] && (
                        <p className="text-[10px] font-mono text-text-muted mt-0.5">
                          {artist.genres.slice(0, 2).join(' • ')}
                        </p>
                      )}

                      {/* Bridge Explanation */}
                      {explanation && (
                        <div className="mt-2 pt-2 border-t border-border-subtle/50 text-[11px] text-text-secondary leading-snug">
                          <span className="text-[9px] font-mono uppercase text-accent-amber block mb-0.5">
                            {explanation.type.replace('_', ' ')}
                          </span>
                          {explanation.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls: Save and Replay */}
      {pathResult?.found && (
        <div className="pt-3 border-t border-border-subtle space-y-2">
          <input
            type="text"
            value={journeyTitle}
            onChange={(e) => setJourneyTitle(e.target.value)}
            placeholder="Name this cosmic journey..."
            className="w-full bg-surface-raised border border-border-subtle text-text-primary text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-cyan"
          />

          <button
            type="button"
            onClick={handleSaveJourney}
            disabled={isSaved}
            className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
              isSaved
                ? 'bg-accent-cyan/20 border border-accent-cyan text-accent-cyan cursor-default'
                : 'bg-surface-raised hover:bg-surface border border-border-subtle text-text-primary cursor-pointer'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Journey Saved in Library' : 'Save Cosmic Journey to Library'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

