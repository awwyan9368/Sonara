import Dexie, { type Table } from 'dexie';
import {
  Artist,
  Album,
  Track,
  Relationship,
  TasteCluster,
  Journey,
  TasteSnapshot,
  UserPreferences,
} from '@/types';
import { DEMO_UNIVERSE_DATA } from '@/data/demo/universeData';

export const DEFAULT_PREFERENCES: UserPreferences = {
  visualQuality: 'high',
  particleDensity: 1.0,
  bloomIntensity: 0.7,
  backgroundMotion: true,
  cameraSensitivity: 1.0,
  labelDensity: 'balanced',
  audioSensitivity: 1.2,
  defaultPreset: 'cosmic_pulse',
  reducedMotion: false,
  explorationMode: '3d',
  activeProvider: 'demo',
};

export class SonaraDatabase extends Dexie {
  artists!: Table<Artist, string>;
  albums!: Table<Album, string>;
  tracks!: Table<Track, string>;
  relationships!: Table<Relationship, string>;
  clusters!: Table<TasteCluster, string>;
  journeys!: Table<Journey, string>;
  snapshots!: Table<TasteSnapshot, string>;
  preferences!: Table<UserPreferences & { id: string }, string>;

  constructor() {
    super('SonaraDatabase');

    // Schema version 1
    this.version(1).stores({
      artists: 'id, name, source, clusterId, prominence',
      albums: 'id, title, source',
      tracks: 'id, title, albumId, source',
      relationships: 'id, sourceId, targetId, type, score',
      clusters: 'id, label',
      journeys: 'id, startArtistId, destinationArtistId, createdAt',
      snapshots: 'id, timestamp',
      preferences: 'id',
    });
  }
}

export const db = new SonaraDatabase();

/**
 * Initialize database with demo data if empty, and default preferences
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const artistCount = await db.artists.count();
    if (artistCount === 0) {
      await resetToDemoData();
    }

    const pref = await db.preferences.get('user_prefs');
    if (!pref) {
      await db.preferences.put({ id: 'user_prefs', ...DEFAULT_PREFERENCES });
    }
  } catch (error) {
    console.warn('IndexedDB initialization failed (likely SSR or private mode):', error);
  }
}

/**
 * Seed or reset demo data without destroying user data
 */
export async function resetToDemoData(): Promise<void> {
  await db.transaction('rw', [db.artists, db.albums, db.tracks, db.relationships, db.clusters], async () => {
    // Delete only demo items
    await db.artists.where('source').equals('demo').delete();
    await db.albums.where('source').equals('demo').delete();
    await db.tracks.where('source').equals('demo').delete();

    // Populate demo data
    await db.artists.bulkPut(DEMO_UNIVERSE_DATA.artists);
    await db.albums.bulkPut(DEMO_UNIVERSE_DATA.albums);
    await db.tracks.bulkPut(DEMO_UNIVERSE_DATA.tracks);
    await db.relationships.bulkPut(DEMO_UNIVERSE_DATA.relationships);
    await db.clusters.bulkPut(DEMO_UNIVERSE_DATA.clusters);
  });
}

/**
 * Clear personal imported data (leaves demo data intact)
 */
export async function clearUserImportedData(): Promise<void> {
  await db.transaction('rw', [db.artists, db.albums, db.tracks], async () => {
    await db.artists.where('source').equals('user').delete();
    await db.albums.where('source').equals('user').delete();
    await db.tracks.where('source').equals('user').delete();
  });
}

/**
 * Export all database state to a JSON structure
 */
export async function exportDatabaseBackup(): Promise<string> {
  const [artists, albums, tracks, relationships, clusters, journeys, snapshots, prefs] = await Promise.all([
    db.artists.toArray(),
    db.albums.toArray(),
    db.tracks.toArray(),
    db.relationships.toArray(),
    db.clusters.toArray(),
    db.journeys.toArray(),
    db.snapshots.toArray(),
    db.preferences.toArray(),
  ]);

  const payload = {
    app: 'SONARA',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      artists,
      albums,
      tracks,
      relationships,
      clusters,
      journeys,
      snapshots,
      preferences: prefs[0] || DEFAULT_PREFERENCES,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Validate and restore database state from backup JSON
 */
export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; message: string; recordCount?: number }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || parsed.app !== 'SONARA' || !parsed.data) {
      return { success: false, message: 'Invalid SONARA backup format.' };
    }

    const { artists, albums, tracks, relationships, clusters, journeys, snapshots, preferences } = parsed.data;

    if (!Array.isArray(artists)) {
      return { success: false, message: 'Invalid payload: artists array is required.' };
    }

    await db.transaction('rw', [db.artists, db.albums, db.tracks, db.relationships, db.clusters, db.journeys, db.snapshots, db.preferences], async () => {
      if (artists.length) await db.artists.bulkPut(artists);
      if (Array.isArray(albums) && albums.length) await db.albums.bulkPut(albums);
      if (Array.isArray(tracks) && tracks.length) await db.tracks.bulkPut(tracks);
      if (Array.isArray(relationships) && relationships.length) await db.relationships.bulkPut(relationships);
      if (Array.isArray(clusters) && clusters.length) await db.clusters.bulkPut(clusters);
      if (Array.isArray(journeys) && journeys.length) await db.journeys.bulkPut(journeys);
      if (Array.isArray(snapshots) && snapshots.length) await db.snapshots.bulkPut(snapshots);
      if (preferences) await db.preferences.put({ id: 'user_prefs', ...preferences });
    });

    const totalRecords = (artists?.length || 0) + (tracks?.length || 0) + (journeys?.length || 0);
    return {
      success: true,
      message: `Successfully imported ${totalRecords} items into local universe.`,
      recordCount: totalRecords,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed to import JSON: ${errorMsg}` };
  }
}

