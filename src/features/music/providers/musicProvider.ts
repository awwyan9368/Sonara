import { Artist, Album, Track, MusicUniverseData } from '@/types';

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
    return {
      artists: [],
      albums: [],
      tracks: [],
      relationships: [],
      clusters: [],
    };
  }

  async search(query: string): Promise<{ artists: Artist[]; tracks: Track[]; albums: Album[] }> {
    return { artists: [], tracks: [], albums: [] };
  }
}

