'use client';

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Eye,
  Sliders,
  Database,
  Accessibility,
  Check,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { UserPreferences } from '@/types';
import { db, resetToDemoData, clearUserImportedData } from '@/lib/storage/db';

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (newPrefs: UserPreferences) => void;
  onResetCamera: () => void;
}

export function SettingsView({
  preferences,
  onUpdatePreferences,
  onResetCamera,
}: SettingsViewProps) {
  const [saveToast, setSaveToast] = useState(false);

  const update = async (patch: Partial<UserPreferences>) => {
    const next = { ...preferences, ...patch };
    onUpdatePreferences(next);
    await db.preferences.put({ id: 'user_prefs', ...next });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleResetDemoUniverse = async () => {
    if (confirm('Reset demo universe dataset to original factory defaults?')) {
      await resetToDemoData();
      alert('Demo universe successfully reset.');
      window.location.reload();
    }
  };

  const handleClearLocalData = async () => {
    if (confirm('Clear personal user imported items? (Demo universe will stay intact).')) {
      await clearUserImportedData();
      alert('User data cleared.');
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
            Data Source & Provider Integration
          </h2>

          <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-primary">Active Provider</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface border border-border-subtle text-accent-amber">
                Demo Universe (Offline Functional)
              </span>
            </div>
            <p className="text-xs text-text-muted">
              SONARA runs fully locally without external credentials. To configure optional Spotify
              PKCE OAuth, see setup instructions in <code className="text-accent-cyan font-mono">docs/SPOTIFY-SETUP.md</code>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetDemoUniverse}
              className="px-3 py-2 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Reset Demo Universe Data
            </button>

            <button
              type="button"
              onClick={handleClearLocalData}
              className="px-3 py-2 rounded-lg bg-surface-raised hover:bg-surface border border-red-500/30 text-xs font-mono text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              Clear User Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

