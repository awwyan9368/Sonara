'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Eye,
  Sliders,
  Database,
  Accessibility,
  Check,
  RotateCcw,
  ExternalLink,
  Music,
} from 'lucide-react';
import { UserPreferences, MusicUniverseData } from '@/types';
import { db, clearUserImportedData, saveSpotifyUniverseData } from '@/lib/storage/db';
import { SpotifyAdapter } from '@/features/music/spotify/spotifyAdapter';
import { ProviderAuthStatus } from '@/features/music/providers/musicProvider';

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (newPrefs: UserPreferences) => void;
  onResetCamera: () => void;
  onSyncUniverse?: (data: MusicUniverseData) => void;
}

export function SettingsView({
  preferences,
  onUpdatePreferences,
  onResetCamera,
  onSyncUniverse,
}: SettingsViewProps) {
  const [saveToast, setSaveToast] = useState(false);
  const [spotifyStatus, setSpotifyStatus] = useState<ProviderAuthStatus | null>(null);
  const [clientIdInput, setClientIdInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [adapter] = useState(() => new SpotifyAdapter());

  useEffect(() => {
    async function checkStatus() {
      const st = await adapter.getStatus();
      setSpotifyStatus(st);
      const existingId = adapter.getClientId() || '';
      setClientIdInput(existingId === 'your_spotify_client_id_here' ? '' : existingId);
    }
    checkStatus();
  }, [adapter]);

  const handleSaveClientId = () => {
    if (!clientIdInput.trim()) {
      alert('Please enter a valid Spotify Client ID.');
      return;
    }
    adapter.setClientId(clientIdInput.trim());
    adapter.getStatus().then(setSpotifyStatus);
    alert('Spotify Client ID saved to local configuration!');
  };

  const handleConnectSpotify = async () => {
    try {
      setIsConnecting(true);
      if (!adapter.isConfigured()) {
        if (clientIdInput.trim()) {
          adapter.setClientId(clientIdInput.trim());
        } else {
          alert('Please enter your Spotify Client ID first.');
          setIsConnecting(false);
          return;
        }
      }
      const { redirectUrl } = await adapter.connect();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (e) {
      alert(String(e));
      setIsConnecting(false);
    }
  };

  const handleSyncSpotify = async () => {
    setIsSyncing(true);
    try {
      const data = await adapter.getUniverseData(true);
      if (data.artists.length > 0) {
        await saveSpotifyUniverseData(data);
        if (onSyncUniverse) {
          onSyncUniverse(data);
        }
        alert(
          `Successfully synchronized ${data.artists.length} Spotify artists and ${data.tracks.length} planetary tracks across ${data.clusters.length} galaxies!`
        );
      } else {
        alert('Spotify returned 0 top artists/tracks. Please ensure you have active listening activity on this Spotify account.');
      }
    } catch (e) {
      alert('Spotify synchronization failed: ' + String(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectSpotify = async () => {
    if (confirm('Disconnect Spotify and revert to Demo Universe?')) {
      await adapter.disconnect();
      setSpotifyStatus(await adapter.getStatus());
      window.location.reload();
    }
  };

  const update = async (patch: Partial<UserPreferences>) => {
    const next = { ...preferences, ...patch };
    onUpdatePreferences(next);
    await db.preferences.put({ id: 'user_prefs', ...next });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleClearLocalData = async () => {
    if (confirm('Clear locally cached Spotify universe data? You can resync fresh data from Spotify at any time.')) {
      await clearUserImportedData();
      alert('Local universe data cleared.');
      window.location.reload();
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-10 bg-background text-text-primary">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <header className="border-b border-border-subtle pb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-accent-cyan mb-2">
              <SettingsIcon className="w-5 h-5" />
              <span className="text-xs font-mono uppercase tracking-widest">System Configuration</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
            <p className="text-sm text-text-secondary mt-1">
              Configure 3D graphics fidelity, universe navigation dynamics, and local storage.
            </p>
          </div>

          {saveToast && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan text-xs font-mono animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </div>
          )}
        </header>

        {/* 1. Visual Quality & Rendering */}
        <section className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Eye className="w-5 h-5 text-accent-cyan" />
            Universe Visual Fidelity
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-text-muted block mb-1.5">
                Rendering Quality Preset
              </label>
              <select
                value={preferences.visualQuality}
                onChange={(e) => update({ visualQuality: e.target.value as 'performance' | 'balanced' | 'high' | 'ultra' })}
                className="w-full bg-surface-raised border border-border-subtle text-text-primary text-xs rounded-lg p-2.5 focus:outline-none focus:border-accent-cyan"
              >
                <option value="ultra">Ultra (Cinematic Spiral Galaxies, 5000+ Stars, Full Atmospheric Haloes)</option>
                <option value="high">High (Recommended for dedicated GPUs like RTX 2050)</option>
                <option value="balanced">Balanced (Optimized density & shaders for energy efficiency)</option>
                <option value="performance">Performance (Maximum framerate for weak or low-power hardware)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-text-muted block mb-1.5">
                Star Label Density
              </label>
              <select
                value={preferences.labelDensity}
                onChange={(e) => update({ labelDensity: e.target.value as 'minimal' | 'balanced' | 'all' })}
                className="w-full bg-surface-raised border border-border-subtle text-text-primary text-xs rounded-lg p-2.5 focus:outline-none focus:border-accent-cyan"
              >
                <option value="minimal">Minimal (Hover and Selected only)</option>
                <option value="balanced">Balanced (High prominence stars)</option>
                <option value="all">Dense (Show all known labels)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border-subtle/50">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-secondary">Particle Density Multiplier</span>
              <span className="text-accent-cyan">{preferences.particleDensity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.2"
              value={preferences.particleDensity}
              onChange={(e) => update({ particleDensity: Number(e.target.value) })}
              className="w-full accent-accent-cyan h-1.5 bg-surface-raised rounded cursor-pointer"
            />
          </div>
        </section>

        {/* 2. Camera & Navigation Dynamics */}
        <section className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-accent-violet" />
            Universe Camera Dynamics
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-secondary">Orbit & Pan Sensitivity</span>
                <span className="text-accent-violet">{preferences.cameraSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={preferences.cameraSensitivity}
                onChange={(e) => update({ cameraSensitivity: Number(e.target.value) })}
                className="w-full accent-accent-violet h-1.5 bg-surface-raised rounded cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={onResetCamera}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs text-text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Reset 3D Camera to Galactic Origin</span>
            </button>
          </div>
        </section>

        {/* 3. Accessibility & Motion */}
        <section className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-accent-amber" />
            Accessibility & Motion
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border-subtle cursor-pointer hover:border-text-secondary/50 transition-colors">
              <div>
                <p className="text-xs font-semibold text-text-primary">Reduced Motion Mode</p>
                <p className="text-[11px] text-text-muted">
                  Disables background orbital rotation and uses rapid transitions
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.reducedMotion}
                onChange={(e) => update({ reducedMotion: e.target.checked })}
                className="w-4 h-4 accent-accent-cyan cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border-subtle cursor-pointer hover:border-text-secondary/50 transition-colors">
              <div>
                <p className="text-xs font-semibold text-text-primary">Alternative 2D Catalog Mode</p>
                <p className="text-[11px] text-text-muted">
                  Replaces the 3D WebGL viewport with a structured topological list view
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.explorationMode === 'accessible_list'}
                onChange={(e) =>
                  update({ explorationMode: e.target.checked ? 'accessible_list' : '3d' })
                }
                className="w-4 h-4 accent-accent-cyan cursor-pointer"
              />
            </label>
          </div>
        </section>

        {/* 4. Provider & Data Management */}
        <section className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-accent-cyan" />
            Data Source & Spotify Integration
          </h2>

          {/* Spotify PKCE Integration Card */}
          <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center">
                  <Music className="w-4 h-4 text-[#1DB954]" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-primary block">
                    Spotify Integration (PKCE OAuth 2.0)
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {spotifyStatus?.connected
                      ? `Connected as ${spotifyStatus.userName || 'Spotify User'}`
                      : 'Sync your real top artists into the 3D universe'}
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  spotifyStatus?.connected
                    ? 'bg-[#1DB954]/15 border-[#1DB954]/40 text-[#1DB954]'
                    : 'bg-surface border-border-subtle text-text-muted'
                }`}
              >
                {spotifyStatus?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {spotifyStatus?.connected ? (
              <div className="flex items-center gap-3 pt-2 border-t border-border-subtle/50">
                <button
                  type="button"
                  onClick={handleSyncSpotify}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 text-black font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isSyncing ? 'Syncing with Spotify...' : 'Sync Library Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectSpotify}
                  className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-border-subtle/50">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">
                    Spotify Client ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste your Spotify Client ID here"
                      value={clientIdInput}
                      onChange={(e) => setClientIdInput(e.target.value)}
                      className="flex-1 bg-surface border border-border-subtle text-text-primary text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-accent-cyan"
                    />
                    <button
                      type="button"
                      onClick={handleSaveClientId}
                      className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-raised border border-border-subtle text-xs font-mono text-text-primary transition-colors cursor-pointer"
                    >
                      Save ID
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConnectSpotify}
                    disabled={isConnecting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isConnecting ? 'Redirecting to Spotify...' : 'Connect Spotify'}</span>
                  </button>

                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-accent-cyan hover:underline flex items-center gap-1 font-mono"
                  >
                    Get Free Client ID on Spotify Dashboard &rarr;
                  </a>
                </div>

                <div className="text-[11px] text-text-muted bg-surface/60 p-2.5 rounded-lg border border-border-subtle space-y-1">
                  <p className="font-semibold text-text-secondary">Redirect URI to add in your Spotify Dashboard App Settings:</p>
                  <p className="text-[10px] text-accent-amber">Note: Spotify now requires IPv4 literal <code>127.0.0.1</code> instead of <code>localhost</code>.</p>
                  <code className="text-accent-cyan font-mono select-all block bg-surface-raised p-1 rounded">
                    http://127.0.0.1:3001/api/auth/spotify-callback
                  </code>
                  <code className="text-accent-cyan font-mono select-all block bg-surface-raised p-1 rounded">
                    http://127.0.0.1:3000/api/auth/spotify-callback
                  </code>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearLocalData}
              className="px-3 py-2 rounded-lg bg-surface-raised hover:bg-surface border border-red-500/30 text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              Clear Local Universe Cache
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

