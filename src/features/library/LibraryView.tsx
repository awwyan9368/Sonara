'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Library as LibraryIcon,
  Route,
  Sparkles,
  Download,
  Upload,
  Trash2,
  Play,
  Check,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { Journey, Artist, TasteSnapshot } from '@/types';
import {
  db,
  exportDatabaseBackup,
  importDatabaseBackup,
  clearUserImportedData,
} from '@/lib/storage/db';

interface LibraryViewProps {
  onReplayJourney: (journey: Journey) => void;
  onSelectArtist: (artist: Artist) => void;
}

export function LibraryView({ onReplayJourney, onSelectArtist }: LibraryViewProps) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [snapshots, setSnapshots] = useState<TasteSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [j, a, s] = await Promise.all([
        db.journeys.reverse().toArray(),
        db.artists.toArray(),
        db.snapshots.reverse().toArray(),
      ]);
      setJourneys(j);
      setArtists(a);
      setSnapshots(s);
    } catch (e) {
      console.error('Error loading library records:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteJourney = async (id: string) => {
    if (confirm('Delete this saved cosmic journey?')) {
      await db.journeys.delete(id);
      loadData();
    }
  };

  const handleExportBackup = async () => {
    const json = await exportDatabaseBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonara_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Backup exported successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importDatabaseBackup(text);
      setStatusMessage(res.message);
      if (res.success) {
        loadData();
      }
    } catch {
      setStatusMessage('Failed to read import file.');
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleClearUserData = async () => {
    if (confirm('Are you sure you want to clear your imported records? (Demo universe data will remain).')) {
      await clearUserImportedData();
      loadData();
      setStatusMessage('User imported records cleared.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const filteredJourneys = journeys.filter(
    (j) => !searchQuery || (j.title && j.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-10 bg-background text-text-primary">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <header className="border-b border-border-subtle pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent-cyan mb-2">
              <LibraryIcon className="w-5 h-5" />
              <span className="text-xs font-mono uppercase tracking-widest">
                Local IndexedDB Archives
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Cosmic Library</h1>
            <p className="text-sm text-text-secondary mt-1">
              Persistent storage for saved journeys, imported catalog nodes, and historical taste snapshots.
            </p>
          </div>

          {/* Backup / Export / Import Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs text-text-primary transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Export Backup</span>
            </button>

            <input
              ref={importFileRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs text-text-primary transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-accent-violet" />
              <span>Import JSON</span>
            </button>
          </div>
        </header>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Saved Cosmic Journeys Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Route className="w-5 h-5 text-accent-cyan" />
              Saved Cosmic Journeys ({journeys.length})
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter journeys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface border border-border-subtle text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-accent-cyan text-text-primary placeholder:text-text-muted w-44"
              />
            </div>
          </div>

          {filteredJourneys.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface border border-border-subtle text-center space-y-2">
              <Route className="w-8 h-8 text-text-muted mx-auto opacity-50" />
              <p className="text-sm font-medium text-text-secondary">No saved journeys yet.</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Launch a Cosmic Journey in SoundGalaxy to chart paths between stars and save them to your library.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJourneys.map((j) => (
                <div
                  key={j.id}
                  className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3 hover:border-text-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-text-primary">{j.title}</h3>
                      <span className="text-[10px] font-mono text-text-muted">
                        Saved: {new Date(j.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteJourney(j.id)}
                      className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-surface-raised transition-colors"
                      title="Delete Journey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs font-mono text-accent-cyan">
                    {j.orderedPath.length} Star Nodes ({j.orderedPath.length - 1} Hops)
                  </div>

                  <button
                    type="button"
                    onClick={() => onReplayJourney(j)}
                    className="w-full py-2 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs font-semibold text-text-primary flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-accent-cyan"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-accent-cyan" />
                    <span>Replay Journey in Universe</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Catalog Statistics */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-amber" />
            Catalog State
          </h2>

          <div className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Active Catalog: {artists.length} artists persisted in IndexedDB
              </p>
              <p className="text-xs text-text-muted">
                Changes made during sessions persist locally in your browser storage.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearUserData}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-mono transition-colors shrink-0 cursor-pointer"
            >
              Clear User Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

