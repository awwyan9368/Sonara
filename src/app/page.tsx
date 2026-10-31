'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Artist,
  Album,
  Track,
  Relationship,
  TasteCluster,
  Journey,
  UserPreferences,
  MusicUniverseData,
} from '@/types';
import {
  db,
  initializeDatabase,
  saveSpotifyUniverseData,
  DEFAULT_PREFERENCES,
} from '@/lib/storage/db';
import { NavRail, ActiveTab } from '@/components/navigation/NavRail';
import { GlobalSearch } from '@/components/controls/GlobalSearch';
import { ArtistDetailPanel } from '@/components/panels/ArtistDetailPanel';
import { TrackDetailPanel } from '@/components/panels/TrackDetailPanel';
import { CosmicLegend } from '@/components/controls/CosmicLegend';
import { CosmicJourneyPanel } from '@/features/journeys/CosmicJourneyPanel';
import { TasteDnaView } from '@/features/tastedna/components/TasteDnaView';
import { SynesthesiaView } from '@/features/synesthesia/components/SynesthesiaView';
import { LibraryView } from '@/features/library/LibraryView';
import { SettingsView } from '@/features/settings/SettingsView';
import { SpotifyAdapter } from '@/features/music/spotify/spotifyAdapter';
import { alignUniverseToMasterSpiralGalaxy } from '@/features/music/spotify/spotifyMapper';
import { RotateCcw, Compass, Route, Sparkles } from 'lucide-react';

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
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [clusters, setClusters] = useState<TasteCluster[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState<boolean>(false);

  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [activeJourneyPath, setActiveJourneyPath] = useState<string[]>([]);
  const [isJourneyPanelOpen, setIsJourneyPanelOpen] = useState(false);
  const [journeyStartArtist, setJourneyStartArtist] = useState<Artist | null>(null);

  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);
  const [isSyncingDirect, setIsSyncingDirect] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleDirectSync = async () => {
    setIsSyncingDirect(true);
    setSyncError(null);
    try {
      const adapter = new SpotifyAdapter();
      const universe = await adapter.getUniverseData(true);
      if (universe.artists.length > 0) {
        await saveSpotifyUniverseData(universe);
        setArtists(universe.artists);
        setTracks(universe.tracks);
        setRelationships(universe.relationships);
        setClusters(universe.clusters);
        setAlbums(universe.albums);
      } else {
        setSyncError('Spotify library query returned 0 items. Ensure you have played music on your Spotify account.');
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncingDirect(false);
    }
  };

  // Initialize DB and load data
  useEffect(() => {
    async function setup() {
      await initializeDatabase();
      try {
        const [a, t, r, c, alb, prefRecord] = await Promise.all([
          db.artists.toArray(),
          db.tracks.toArray(),
          db.relationships.toArray(),
          db.clusters.toArray(),
          db.albums.toArray(),
          db.preferences.get('user_prefs'),
        ]);

        if (a.length > 0) {
          // Align all artists and song planets to sit seamlessly within the master spiral galaxy
          const aligned = alignUniverseToMasterSpiralGalaxy(a, t, c);
          setArtists(aligned.artists);
          setTracks(aligned.tracks);
          setClusters(aligned.clusters);

          // Persist aligned positions into IndexedDB asynchronously
          db.artists.bulkPut(aligned.artists).catch(console.warn);
          db.tracks.bulkPut(aligned.tracks).catch(console.warn);
          db.clusters.bulkPut(aligned.clusters).catch(console.warn);
        }
        if (r.length > 0) setRelationships(r);
        if (alb.length > 0) setAlbums(alb);

        if (prefRecord) {
          const { id: _, ...p } = prefRecord;
          setPreferences((prev) => ({ ...prev, ...p }));
        }

        const adapter = new SpotifyAdapter();
        const status = await adapter.getStatus();
        setIsSpotifyConnected(status.connected);

        // If local database is empty but Spotify session is valid, auto-import Spotify universe
        if (a.length === 0 && status.connected) {
          const universe = await adapter.getUniverseData();
          if (universe.artists.length > 0) {
            await saveSpotifyUniverseData(universe);
            setArtists(universe.artists);
            setTracks(universe.tracks);
            setRelationships(universe.relationships);
            setClusters(universe.clusters);
            setAlbums(universe.albums);
          }
        }
      } catch (err) {
        console.warn('Database initialization check:', err);
      }
    }
    setup();
  }, []);

  // Ensure origin is normalized to 127.0.0.1 to avoid split local storage with Spotify OAuth
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      window.location.replace(window.location.href.replace('//localhost:', '//127.0.0.1:'));
    }
  }, []);

  const authProcessingRef = useRef(false);

  // Listen for Spotify OAuth callback either via redirect query params or window message
  useEffect(() => {
    async function handleAuthCode(code: string, state: string) {
      if (authProcessingRef.current) return;
      authProcessingRef.current = true;

      try {
        const adapter = new SpotifyAdapter();
        await adapter.handleAuthCallback(code, state);
        const data = await adapter.getUniverseData();
        if (data.artists.length > 0) {
          await saveSpotifyUniverseData(data);
          setArtists(data.artists);
          setTracks(data.tracks);
          setRelationships(data.relationships);
          setClusters(data.clusters);
          setAlbums(data.albums);
          setIsSpotifyConnected(true);
        }
        alert(
          `Spotify connected successfully! Mapped ${data.artists.length} artists across ${data.clusters.length} galaxies with ${data.tracks.length} planetary tracks.`
        );
      } catch (err) {
        console.error('Spotify auth exchange failed:', err);
        alert('Spotify authentication failed: ' + String(err));
      }
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('spotify_code');
      const state = params.get('spotify_state');
      if (code && state) {
        window.history.replaceState({}, '', window.location.pathname);
        handleAuthCode(code, state);
      }
    }

    function handleMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'SPOTIFY_AUTH_SUCCESS') {
        const { code, state } = e.data;
        if (code && state) {
          handleAuthCode(code, state);
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setSelectedTrack(null);
    setSelectedClusterId(artist.clusterId || null);
    if (activeTab !== 'explore') {
      setActiveTab('explore');
    }
  };

  const handleSelectCluster = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    setSelectedArtist(null);
    setSelectedTrack(null);
    if (activeTab !== 'explore') {
      setActiveTab('explore');
    }
  };

  const handleSelectTrack = (track: Track) => {
    setSelectedTrack(track);
    setSelectedArtist(null);
    if (track.position) {
      setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, position: track.position } : t)));
    }
    if (track.parentClusterId) {
      setSelectedClusterId(track.parentClusterId);
    }
    if (activeTab !== 'explore') {
      setActiveTab('explore');
    }
  };

  // Expose global selection helpers for automated visual verification and external deep-linking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __sonaraSelectTrack?: (id: string) => void }).__sonaraSelectTrack = (trackId: string) => {
        const trk = tracks.find((t) => t.id === trackId);
        if (trk) handleSelectTrack(trk);
      };
      (window as unknown as { __sonaraSelectArtist?: (id: string) => void }).__sonaraSelectArtist = (artistId: string) => {
        const art = artists.find((a) => a.id === artistId);
        if (art) handleSelectArtist(art);
      };
      (window as unknown as { __sonaraLoadUniverseData?: (data: MusicUniverseData) => Promise<void> }).__sonaraLoadUniverseData = async (data: MusicUniverseData) => {
        await saveSpotifyUniverseData(data);
        setArtists(data.artists);
        setAlbums(data.albums);
        setTracks(data.tracks);
        setRelationships(data.relationships);
        setClusters(data.clusters);
      };
    }
  }, [tracks, artists]);

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
        isSpotifyConnected={isSpotifyConnected}
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

            {/* Empty Cosmos State */}
            {artists.length === 0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none">
                <div className="max-w-md w-full p-8 rounded-2xl bg-surface/90 border border-border-subtle shadow-2xl backdrop-blur-xl text-center space-y-5 pointer-events-auto animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/40 flex items-center justify-center shadow-[0_0_25px_rgba(29,185,84,0.25)]">
                    <Sparkles className="w-7 h-7 text-[#1DB954]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
                      {isSpotifyConnected ? 'Your SoundGalaxy is Ready to Map' : 'Generate Your SoundGalaxy'}
                    </h2>
                    <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                      {isSpotifyConnected
                        ? 'Your Spotify account is authenticated. Synchronize your listening history to generate your dynamic spiral galaxies, star systems, and orbiting planets.'
                        : 'Connect your Spotify account in Settings to generate your personal astronomical universe from your listening history.'}
                    </p>
                  </div>

                  {syncError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left">
                      {syncError}
                    </div>
                  )}

                  {isSpotifyConnected ? (
                    <button
                      type="button"
                      onClick={handleDirectSync}
                      disabled={isSyncingDirect}
                      className="w-full py-3 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(29,185,84,0.3)] cursor-pointer"
                    >
                      {isSyncingDirect ? 'Synchronizing Spotify Universe...' : 'Sync Spotify Library Now'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="w-full py-3 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(29,185,84,0.3)] cursor-pointer"
                    >
                      Connect Spotify in Settings
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cosmic Legend Explaining Celestial Rules */}
            <CosmicLegend />

            {/* Top Minimal Toolbar Controls */}
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between pointer-events-none z-30">
              <div className="pointer-events-auto">
                <GlobalSearch
                  artists={artists}
                  tracks={tracks}
                  albums={albums}
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

            {/* Contextual Track Detail Panel */}
            {selectedTrack && !selectedArtist && !isJourneyPanelOpen && (
              <TrackDetailPanel
                track={selectedTrack}
                artist={artists.find((a) => selectedTrack.artistIds.includes(a.id)) || null}
                album={albums.find((alb) => alb.id === selectedTrack.albumId) || null}
                cluster={clusters.find((c) => c.id === selectedTrack.parentClusterId) || null}
                onClose={() => setSelectedTrack(null)}
                onSelectArtist={handleSelectArtist}
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
            tracks={tracks}
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
            onSyncUniverse={(data) => {
              setArtists(data.artists);
              setTracks(data.tracks);
              setRelationships(data.relationships);
              setClusters(data.clusters);
              setAlbums(data.albums);
              setIsSpotifyConnected(true);
            }}
          />
        )}
      </main>
    </div>
  );
}

