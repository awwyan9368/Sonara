import { Artist, Album, Track, MusicUniverseData } from '@/types';
import { DEMO_UNIVERSE_DATA } from '@/data/demo/universeData';

export interface ProviderAuthStatus {
  connected: boolean;
  provider: 'demo' | 'spotify' | 'user';
  userName?: string;
  avatarUrl?: string;
  expiresAt?: number;
  scopes?: string[];
  error?: string;
}

export interface IMusicProvider {
  name: string;
  getStatus(): Promise<ProviderAuthStatus>;
  connect(): Promise<{ redirectUrl?: string; success: boolean }>;
  disconnect(): Promise<void>;
  getUniverseData(): Promise<MusicUniverseData>;
  search(query: string): Promise<{ artists: Artist[]; tracks: Track[]; albums: Album[] }>;
}

export class DemoMusicProvider implements IMusicProvider {
  public name = 'Demo Universe';

  async getStatus(): Promise<ProviderAuthStatus> {
    return {
      connected: true,
      provider: 'demo',
      userName: 'Cosmic Explorer',
      scopes: ['read_universe', 'demo_mode'],
    };
  }

  async connect(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async disconnect(): Promise<void> {
    // Demo mode is always accessible
  }

  async getUniverseData(): Promise<MusicUniverseData> {
    return DEMO_UNIVERSE_DATA;
  }

  async search(query: string): Promise<{ artists: Artist[]; tracks: Track[]; albums: Album[] }> {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { artists: [], tracks: [], albums: [] };
    }

    const artists = DEMO_UNIVERSE_DATA.artists.filter(
      (a) => a.name.toLowerCase().includes(q) || a.genres.some((g) => g.toLowerCase().includes(q))
    );

    const tracks = DEMO_UNIVERSE_DATA.tracks.filter((t) => t.title.toLowerCase().includes(q));

    const albums = DEMO_UNIVERSE_DATA.albums.filter((alb) => alb.title.toLowerCase().includes(q));

    return { artists, tracks, albums };
  }
}

