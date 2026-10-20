import { Artist, Album, Track, MusicUniverseData } from '@/types';
import { IMusicProvider, ProviderAuthStatus } from '../providers/musicProvider';
import { DEMO_UNIVERSE_DATA } from '@/data/demo/universeData';

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SCOPES = ['user-read-private', 'user-top-read', 'playlist-read-private'];

// Helper for PKCE code generation
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return base64;
}

export class SpotifyAdapter implements IMusicProvider {
  public name = 'Spotify';
  private clientId: string | undefined;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientId.trim() !== '' && this.clientId !== 'your_spotify_client_id_here');
  }

  async getStatus(): Promise<ProviderAuthStatus> {
    if (typeof window === 'undefined') {
      return { connected: false, provider: 'spotify', error: 'Server rendering' };
    }

    if (!this.isConfigured()) {
      return {
        connected: false,
        provider: 'spotify',
        error: 'Spotify Client ID is not configured in .env.local. Demo Universe active.',
      };
    }

    const token = localStorage.getItem('sonara_spotify_access_token');
    const expiresAt = Number(localStorage.getItem('sonara_spotify_expires_at') || '0');

    if (!token || Date.now() >= expiresAt) {
      return {
        connected: false,
        provider: 'spotify',
        error: token ? 'Spotify session expired. Please reconnect.' : undefined,
      };
    }

    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return { connected: false, provider: 'spotify', error: 'Failed to authenticate with Spotify API.' };
      }

      const user = await res.json();
      return {
        connected: true,
        provider: 'spotify',
        userName: user.display_name || user.id,
        avatarUrl: user.images?.[0]?.url,
        expiresAt,
        scopes: SCOPES,
      };
    } catch {
      return { connected: false, provider: 'spotify', error: 'Network error communicating with Spotify.' };
    }
  }

  async connect(): Promise<{ redirectUrl?: string; success: boolean }> {
    if (!this.isConfigured()) {
      throw new Error(
        'Spotify integration requires NEXT_PUBLIC_SPOTIFY_CLIENT_ID in .env.local. Please see docs/SPOTIFY-SETUP.md.'
      );
    }

    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);
    const state = generateRandomString(16);

    localStorage.setItem('sonara_spotify_verifier', verifier);
    localStorage.setItem('sonara_spotify_state', state);

    const redirectUri = `${window.location.origin}/api/auth/spotify-callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId!,
      scope: SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: challenge,
      redirect_uri: redirectUri,
      state: state,
    });

    const authUrl = `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
    return { redirectUrl: authUrl, success: true };
  }

  async handleAuthCallback(code: string, returnedState: string): Promise<boolean> {
    const savedState = localStorage.getItem('sonara_spotify_state');
    const verifier = localStorage.getItem('sonara_spotify_verifier');

    if (!savedState || savedState !== returnedState || !verifier) {
      throw new Error('OAuth state mismatch security failure.');
    }

    const redirectUri = `${window.location.origin}/api/auth/spotify-callback`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId!,
      code_verifier: verifier,
    });

    const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error('Failed to exchange code for token.');
    }

    const data = await res.json();
    const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

    localStorage.setItem('sonara_spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('sonara_spotify_refresh_token', data.refresh_token);
    }
    localStorage.setItem('sonara_spotify_expires_at', String(expiresAt));

    return true;
  }

  async disconnect(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sonara_spotify_access_token');
      localStorage.removeItem('sonara_spotify_refresh_token');
      localStorage.removeItem('sonara_spotify_expires_at');
    }
  }

  async getUniverseData(): Promise<MusicUniverseData> {
    const status = await this.getStatus();
    if (!status.connected) {
      // Fallback cleanly to demo data
      return DEMO_UNIVERSE_DATA;
    }

    // In connected mode, fetch top artists and tracks
    try {
      const token = localStorage.getItem('sonara_spotify_access_token');
      const res = await fetch('https://api.spotify.com/v1/me/top/artists?limit=30&time_range=medium_term', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return DEMO_UNIVERSE_DATA;

      const data = await res.json();
      const spotifyArtists = data.items || [];

      // Normalize into Sonara internal model
      const normalizedArtists: Artist[] = spotifyArtists.map((a: { id: string; name: string; genres: string[]; popularity: number; images?: Array<{ url: string }> }, idx: number) => {
        // Deterministic radial angle for placement
        const angle = (idx / Math.max(1, spotifyArtists.length)) * Math.PI * 2;
        const radius = 25 + (idx % 3) * 10;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = ((idx % 5) - 2) * 6;

        return {
          id: `spot_${a.id}`,
          name: a.name,
          genres: a.genres?.slice(0, 3) || ['Contemporary'],
          artworkUrl: a.images?.[0]?.url,
          source: 'spotify' as const,
          prominence: a.popularity || 50,
          position: [x, y, z],
          bio: `Spotify imported artist (${a.genres?.join(', ') || 'Various genres'}).`,
        };
      });

      return {
        artists: normalizedArtists,
        albums: DEMO_UNIVERSE_DATA.albums,
        tracks: DEMO_UNIVERSE_DATA.tracks,
        relationships: DEMO_UNIVERSE_DATA.relationships,
        clusters: DEMO_UNIVERSE_DATA.clusters,
      };
    } catch {
      return DEMO_UNIVERSE_DATA;
    }
  }

  async search(query: string): Promise<{ artists: Artist[]; tracks: Track[]; albums: Album[] }> {
    const status = await this.getStatus();
    if (!status.connected) {
      const demo = new (await import('../providers/musicProvider')).DemoMusicProvider();
      return demo.search(query);
    }
    // Search implementation
    return { artists: [], tracks: [], albums: [] };
  }
}

