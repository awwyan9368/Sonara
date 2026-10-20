'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Artist,
  Track,
  Relationship,
  TasteCluster,
  Journey,
  UserPreferences,
} from '@/types';
import { DEMO_UNIVERSE_DATA } from '@/data/demo/universeData';
import {
  db,
  initializeDatabase,
  DEFAULT_PREFERENCES,
} from '@/lib/storage/db';
import { NavRail, ActiveTab } from '@/components/navigation/NavRail';
import { GlobalSearch } from '@/components/controls/GlobalSearch';
import { ArtistDetailPanel } from '@/components/panels/ArtistDetailPanel';
import { CosmicJourneyPanel } from '@/features/journeys/CosmicJourneyPanel';
import { TasteDnaView } from '@/features/tastedna/components/TasteDnaView';
import { SynesthesiaView } from '@/features/synesthesia/components/SynesthesiaView';
import { LibraryView } from '@/features/library/LibraryView';
import { SettingsView } from '@/features/settings/SettingsView';
import { RotateCcw, Compass, Route } from 'lucide-react';

// Dynamic import with SSR disabled for Three.js canvas to avoid hydration errors
const UniverseCanvas = dynamic(
  () =>
    import('@/features/universe/components/UniverseCanvas').then(
      (mod) => mod.UniverseCanvas
    ),
  { ssr: false }
);

export default function SonaraMainPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [artists, setArtists] = useState<Artist[]>(DEMO_UNIVERSE_DATA.artists);
  const [tracks, setTracks] = useState<Track[]>(DEMO_UNIVERSE_DATA.tracks);
  const [relationships, setRelationships] = useState<Relationship[]>(
    DEMO_UNIVERSE_DATA.relationships
  );
  const [clusters, setClusters] = useState<TasteCluster[]>(
    DEMO_UNIVERSE_DATA.clusters
  );
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [activeJourneyPath, setActiveJourneyPath] = useState<string[]>([]);
  const [isJourneyPanelOpen, setIsJourneyPanelOpen] = useState(false);
  const [journeyStartArtist, setJourneyStartArtist] = useState<Artist | null>(null);

  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

  // Initialize DB and load data
  useEffect(() => {
    async function setup() {
      await initializeDatabase();
      try {
        const [a, t, r, c, prefRecord] = await Promise.all([
          db.artists.toArray(),
          db.tracks.toArray(),
          db.relationships.toArray(),
          db.clusters.toArray(),
          db.preferences.get('user_prefs'),
        ]);

        if (a.length > 0) setArtists(a);
        if (t.length > 0) setTracks(t);
        if (r.length > 0) setRelationships(r);
        if (c.length > 0) setClusters(c);
        if (prefRecord) {
          const { id: _, ...p } = prefRecord;
          setPreferences((prev) => ({ ...prev, ...p }));
        }
      } catch (err) {
        console.warn('Using bundled demo data:', err);
      }
    }
    setup();
  }, []);

  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setSelectedClusterId(artist.clusterId || null);
    if (activeTab !== 'explore') {
      setActiveTab('explore');
    }
  };

  const handleSelectCluster = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    setSelectedArtist(null);
    if (activeTab !== 'explore') {
      setActiveTab('explore');
    }
  };

  const handleSelectTrack = (track: Track) => {
    setSelectedTrack(track);
    const parentArtist = artists.find((a) => track.artistIds.includes(a.id));
    if (parentArtist) {
      setSelectedArtist(parentArtist);
    }
  };

  const handleStartJourney = (startArtist: Artist) => {
    setJourneyStartArtist(startArtist);
    setIsJourneyPanelOpen(true);
    setActiveTab('explore');
  };

  const handleReplayJourney = (journey: Journey) => {
    setActiveJourneyPath(journey.orderedPath);
    const firstArtist = artists.find((a) => a.id === journey.startArtistId);
    if (firstArtist) {
      setSelectedArtist(firstArtist);
    }
    setActiveTab('explore');
  };

  const handleResetCamera = () => {
    setSelectedArtist(null);
    setSelectedClusterId(null);
    setActiveJourneyPath([]);
    setResetCameraTrigger((prev) => prev + 1);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex bg-background">
      {/* Navigation Rail */}
      <NavRail
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'journey') {
            setIsJourneyPanelOpen(true);
            setActiveTab('explore');
          }
        }}
        isDemoMode={true}
      />

      {/* Main View Area */}
      <main className="relative flex-1 h-full pl-16 md:pl-20 overflow-hidden">
        {/* VIEW: SOUNDGALAXY (3D Universe) */}
        {activeTab === 'explore' && (
          <div className="relative w-full h-full">
            {/* 3D Canvas */}
            <UniverseCanvas
              artists={artists}
              clusters={clusters}
              relationships={relationships}
              tracks={tracks}
              selectedArtist={selectedArtist}
              selectedClusterId={selectedClusterId}
              selectedTrackId={selectedTrack?.id || null}
              activeJourneyPath={activeJourneyPath}
              preferences={preferences}
              resetCameraTrigger={resetCameraTrigger}
              onSelectArtist={handleSelectArtist}
              onSelectCluster={handleSelectCluster}
              onSelectTrack={handleSelectTrack}
            />

            {/* Top Minimal Toolbar Controls */}
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between pointer-events-none z-30">
              <div className="pointer-events-auto">
                <GlobalSearch
                  artists={artists}
                  tracks={tracks}
                  albums={[]}
                  clusters={clusters}
                  onSelectArtist={handleSelectArtist}
                  onSelectTrack={handleSelectTrack}
                  onSelectCluster={handleSelectCluster}
                />
              </div>

              {/* Camera Actions & Journey Trigger */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsJourneyPanelOpen((prev) => !prev)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all text-xs font-mono cursor-pointer ${
                    isJourneyPanelOpen
                      ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_12px_rgba(100,223,255,0.4)]'
                      : 'bg-surface/75 border-border-subtle hover:border-text-secondary/50 text-text-secondary hover:text-text-primary'
                  }`}
                  aria-label="Toggle Cosmic Journey planner"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cosmic Journey</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/75 border border-border-subtle hover:border-accent-cyan text-text-secondary hover:text-text-primary backdrop-blur-md transition-all text-xs font-mono cursor-pointer"
                  title="Reset 3D camera to default origin"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Recenter</span>
                </button>
              </div>
            </div>

            {/* Contextual Artist Detail Panel */}
            {selectedArtist && !isJourneyPanelOpen && (
              <ArtistDetailPanel
                artist={selectedArtist}
                tracks={tracks}
                relationships={relationships}
                allArtists={artists}
                clusters={clusters}
                onClose={() => setSelectedArtist(null)}
                onSelectArtist={handleSelectArtist}
                onSelectTrack={handleSelectTrack}
                onStartJourney={handleStartJourney}
              />
            )}

            {/* Cosmic Journey Stepper Panel */}
            {isJourneyPanelOpen && (
              <CosmicJourneyPanel
                artists={artists}
                relationships={relationships}
                initialStartArtist={journeyStartArtist || selectedArtist}
                onClose={() => setIsJourneyPanelOpen(false)}
                onNavigateToArtist={handleSelectArtist}
                onUpdateJourneyPath={setActiveJourneyPath}
              />
            )}
          </div>
        )}

        {/* VIEW: TASTEDNA */}
        {activeTab === 'tastedna' && (
          <TasteDnaView
            artists={artists}
            tracks={tracks}
            relationships={relationships}
            clusters={clusters}
            onFocusClusterInUniverse={(clusterId) => {
              setSelectedClusterId(clusterId);
              setActiveTab('explore');
            }}
            onSelectArtist={(a) => {
              handleSelectArtist(a);
              setActiveTab('explore');
            }}
          />
        )}

        {/* VIEW: SYNESTHESIA */}
        {activeTab === 'synesthesia' && (
          <SynesthesiaView
            onReturnToUniverse={() => setActiveTab('explore')}
            reducedMotion={preferences.reducedMotion}
          />
        )}

        {/* VIEW: LIBRARY */}
        {activeTab === 'library' && (
          <LibraryView
            onReplayJourney={handleReplayJourney}
            onSelectArtist={(a) => {
              handleSelectArtist(a);
              setActiveTab('explore');
            }}
          />
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsView
            preferences={preferences}
            onUpdatePreferences={setPreferences}
            onResetCamera={handleResetCamera}
          />
        )}
      </main>
    </div>
  );
}

