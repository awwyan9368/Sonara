import { Artist, Album, Track, MusicUniverseData } from '@/types';
import { IMusicProvider, ProviderAuthStatus } from '../providers/musicProvider';
import { buildSpotifyUniverseData, SpotifyRawArtist, SpotifyRawTrack } from './spotifyMapper';

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'user-read-private',
  'user-top-read',
  'playlist-read-private',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
];

export interface SpotifyCurrentlyPlaying {
  isPlaying: boolean;
  trackId?: string;
  trackTitle?: string;
  artistName?: string;
  albumName?: string;
  albumArtUrl?: string;
  progressMs?: number;
  durationMs?: number;
  spotifyUri?: string;
  deviceName?: string;
}

// Helper for PKCE code generation
function getNormalizedOrigin(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:3001';
  return window.location.origin.replace('localhost', '127.0.0.1');
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

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
  private cachedUniverseData: MusicUniverseData | null = null;
  private lastFetchTime = 0;
  private isRefreshingToken = false;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  }

  public getClientId(): string | undefined {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sonara_spotify_client_id');
      if (stored && stored.trim() !== '') return stored.trim();
    }
    return this.clientId;
  }

  public setClientId(id: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sonara_spotify_client_id', id.trim());
    }
    this.clientId = id.trim();
  }

  isConfigured(): boolean {
    const cid = this.getClientId();
    return Boolean(cid && cid.trim() !== '' && cid !== 'your_spotify_client_id_here');
  }

  async refreshAccessToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.isRefreshingToken) return false;

    const refreshToken = localStorage.getItem('sonara_spotify_refresh_token');
    const clientId = this.getClientId();
    if (!refreshToken || !clientId) return false;

    this.isRefreshingToken = true;
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      });

      const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        console.warn('Spotify token refresh rejected:', res.status);
        return false;
      }

      const data = await res.json();
      const expiresAt = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
      localStorage.setItem('sonara_spotify_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('sonara_spotify_refresh_token', data.refresh_token);
      }
      localStorage.setItem('sonara_spotify_expires_at', String(expiresAt));
      return true;
    } catch (e) {
      console.error('Error refreshing Spotify access token:', e);
      return false;
    } finally {
      this.isRefreshingToken = false;
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    let token = localStorage.getItem('sonara_spotify_access_token');
    const expiresAt = Number(localStorage.getItem('sonara_spotify_expires_at') || '0');

    if (!token || Date.now() >= expiresAt - 30000) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        return token && Date.now() < expiresAt ? token : null;
      }
      token = localStorage.getItem('sonara_spotify_access_token');
    }
    return token;
  }

  async fetchWithAuth<T>(url: string, attempt = 0): Promise<T | null> {
    const token = await this.getValidAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 429) {
        // Rate limited - respect Retry-After
        const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
        if (attempt < 2) {
          console.warn(`Spotify API rate limit encountered. Backing off for ${retryAfter}s...`);
          await new Promise((r) => setTimeout(r, Math.min(retryAfter * 1000, 5000)));
          return this.fetchWithAuth<T>(url, attempt + 1);
        }
        return null;
      }

      if (res.status === 401 && attempt === 0) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.fetchWithAuth<T>(url, 1);
        }
        return null;
      }

      if (!res.ok) {
        console.warn(`Spotify API request failed [${res.status}]: ${url}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (e) {
      console.error(`Network error during Spotify request to ${url}:`, e);
      return null;
    }
  }

  async getStatus(): Promise<ProviderAuthStatus> {
    if (typeof window === 'undefined') {
      return { connected: false, provider: 'spotify', error: 'Server rendering' };
    }

    if (!this.isConfigured()) {
      return {
        connected: false,
        provider: 'spotify',
        error: 'Spotify Client ID is not configured.',
      };
    }

    const token = await this.getValidAccessToken();
    const expiresAt = Number(localStorage.getItem('sonara_spotify_expires_at') || '0');

    if (!token) {
      return {
        connected: false,
        provider: 'spotify',
        error: 'Not connected to Spotify or session expired.',
      };
    }

    try {
      const user = await this.fetchWithAuth<{
        id: string;
        display_name?: string;
        images?: Array<{ url: string }>;
      }>('https://api.spotify.com/v1/me');

      if (!user) {
        return { connected: false, provider: 'spotify', error: 'Failed to authenticate with Spotify API.' };
      }

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
        'Spotify integration requires NEXT_PUBLIC_SPOTIFY_CLIENT_ID in .env.local or entered in Settings. Please see docs/SPOTIFY-SETUP.md.'
      );
    }

    const clientId = this.getClientId()!;
    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);

    // Pack verifier and clientId into state token to ensure resilience against
    // browser origin partitions (localhost vs 127.0.0.1) and lost storage across redirects
    const statePayload = JSON.stringify({
      v: verifier,
      c: clientId,
      s: generateRandomString(12),
    });
    const state = 'snr_' + toBase64Url(statePayload);

    if (typeof window !== 'undefined') {
      localStorage.setItem('sonara_spotify_verifier', verifier);
      localStorage.setItem('sonara_spotify_state', state);
    }

    const redirectUri = `${getNormalizedOrigin()}/api/auth/spotify-callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
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
    let verifier = typeof window !== 'undefined' ? localStorage.getItem('sonara_spotify_verifier') : null;
    let clientId = this.getClientId();

    // Recover verifier and clientId from state payload if available
    if (returnedState && returnedState.startsWith('snr_')) {
      try {
        const raw = fromBase64Url(returnedState.slice(4));
        const parsed = JSON.parse(raw);
        if (parsed.v) verifier = parsed.v;
        if (parsed.c) {
          clientId = parsed.c;
          this.setClientId(parsed.c);
        }
      } catch (err) {
        console.warn('Could not unpack state payload:', err);
      }
    }

    const savedState = typeof window !== 'undefined' ? localStorage.getItem('sonara_spotify_state') : null;

    // Validate state integrity: if state existed in local storage, it must match
    if (savedState && returnedState && savedState !== returnedState) {
      throw new Error('OAuth state mismatch security failure.');
    }

    if (!verifier) {
      throw new Error('OAuth verifier is missing. Please initiate connection again.');
    }

    if (!clientId) {
      throw new Error('Spotify Client ID is missing. Please enter your Client ID in Settings.');
    }

    const redirectUri = `${getNormalizedOrigin()}/api/auth/spotify-callback`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    });

    const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Spotify token exchange error:', res.status, errText);
      throw new Error(`Failed to exchange code for token (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

    if (typeof window !== 'undefined') {
      localStorage.setItem('sonara_spotify_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('sonara_spotify_refresh_token', data.refresh_token);
      }
      localStorage.setItem('sonara_spotify_expires_at', String(expiresAt));
      localStorage.removeItem('sonara_spotify_verifier');
      localStorage.removeItem('sonara_spotify_state');
    }

    return true;
  }

  async disconnect(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sonara_spotify_access_token');
      localStorage.removeItem('sonara_spotify_refresh_token');
      localStorage.removeItem('sonara_spotify_expires_at');
    }
  }

  async getUniverseData(forceRefresh = false): Promise<MusicUniverseData> {
    const status = await this.getStatus();
    if (!status.connected) {
      return {
        artists: [],
        albums: [],
        tracks: [],
        relationships: [],
        clusters: [],
      };
    }

    const now = Date.now();
    if (!forceRefresh && this.cachedUniverseData && (now - this.lastFetchTime < 300000)) {
      return this.cachedUniverseData;
    }

    // In connected mode, fetch top artists and tracks across medium and long term + recently played
    try {
      const [artistsMed, artistsLong, tracksMed, tracksLong, playlistsData, recentlyPlayedData] = await Promise.all([
        this.fetchWithAuth<{ items: SpotifyRawArtist[] }>(
          'https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term'
        ),
        this.fetchWithAuth<{ items: SpotifyRawArtist[] }>(
          'https://api.spotify.com/v1/me/top/artists?limit=50&time_range=long_term'
        ),
        this.fetchWithAuth<{ items: SpotifyRawTrack[] }>(
          'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term'
        ),
        this.fetchWithAuth<{ items: SpotifyRawTrack[] }>(
          'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term'
        ),
        this.fetchWithAuth<{ items: Array<{ id: string; name: string }> }>(
          'https://api.spotify.com/v1/me/playlists?limit=10'
        ),
        this.fetchWithAuth<{ items: Array<{ track: SpotifyRawTrack; played_at: string }> }>(
          'https://api.spotify.com/v1/me/player/recently-played?limit=50'
        ),
      ]);

      const rawArtists: SpotifyRawArtist[] = [];
      const rawTracks: SpotifyRawTrack[] = [];
      const recentPlayCounts = new Map<string, number>();

      if (artistsMed?.items && Array.isArray(artistsMed.items)) rawArtists.push(...artistsMed.items);
      if (artistsLong?.items && Array.isArray(artistsLong.items)) rawArtists.push(...artistsLong.items);
      if (tracksMed?.items && Array.isArray(tracksMed.items)) rawTracks.push(...tracksMed.items);
      if (tracksLong?.items && Array.isArray(tracksLong.items)) rawTracks.push(...tracksLong.items);

      if (recentlyPlayedData?.items && Array.isArray(recentlyPlayedData.items)) {
        recentlyPlayedData.items.forEach((item) => {
          if (item?.track?.id) {
            recentPlayCounts.set(item.track.id, (recentPlayCounts.get(item.track.id) || 0) + 1);
            rawTracks.push(item.track);
          }
        });
      }

      // Deduplicate raw artists by ID
      const artistMap = new Map<string, SpotifyRawArtist>();
      rawArtists.forEach((a) => {
        if (a && a.id && !artistMap.has(a.id)) {
          artistMap.set(a.id, a);
        }
      });

      // Track existing artist IDs that already have at least 1 track in rawTracks
      const artistsWithTracks = new Set<string>();
      rawTracks.forEach((t) => {
        if (t && t.artists && Array.isArray(t.artists)) {
          t.artists.forEach((a) => {
            if (a && a.id) artistsWithTracks.add(a.id);
          });
        }
      });

      // For top artists without tracks in top 50, fetch their top 3 tracks so planets orbit every star!
      const topArtistsWithoutTracks = Array.from(artistMap.values())
        .filter((a) => !artistsWithTracks.has(a.id))
        .slice(0, 15);

      if (topArtistsWithoutTracks.length > 0) {
        const topTracksResults = await Promise.all(
          topArtistsWithoutTracks.map((a) =>
            this.fetchWithAuth<{ tracks: SpotifyRawTrack[] }>(
              `https://api.spotify.com/v1/artists/${a.id}/top-tracks?market=from_token`
            )
          )
        );

        topTracksResults.forEach((res) => {
          if (res?.tracks && Array.isArray(res.tracks)) {
            rawTracks.push(...res.tracks.slice(0, 3));
          }
        });
      }

      // If user has playlists and track list is sparse, enrich from the first 2 playlists
      if (rawTracks.length < 20 && playlistsData?.items && playlistsData.items.length > 0) {
        const playlistFetchPromises = playlistsData.items.slice(0, 2).map((pl) =>
          this.fetchWithAuth<{ items: Array<{ track: SpotifyRawTrack }> }>(
            `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=25`
          )
        );
        const plResults = await Promise.all(playlistFetchPromises);
        plResults.forEach((plRes) => {
          if (plRes?.items && Array.isArray(plRes.items)) {
            plRes.items.forEach((item) => {
              if (item?.track && item.track.id) {
                rawTracks.push(item.track);
              }
            });
          }
        });
      }

      const universe = buildSpotifyUniverseData(Array.from(artistMap.values()), rawTracks, recentPlayCounts);
      this.cachedUniverseData = universe;
      this.lastFetchTime = now;
      return universe;
    } catch (err) {
      console.error('Failed to fetch and map Spotify universe data:', err);
      return {
        artists: [],
        albums: [],
        tracks: [],
        relationships: [],
        clusters: [],
      };
    }
  }

  /**
   * Fetches currently active Spotify playback state from desktop/mobile Spotify client
   */
  async getCurrentlyPlaying(): Promise<SpotifyCurrentlyPlaying> {
    const status = await this.getStatus();
    if (!status.connected) {
      return { isPlaying: false };
    }

    try {
      const data = await this.fetchWithAuth<{
        is_playing: boolean;
        progress_ms?: number;
        device?: { name: string; type: string };
        item?: {
          id: string;
          name: string;
          duration_ms: number;
          uri: string;
          artists: Array<{ name: string }>;
          album?: { name: string; images?: Array<{ url: string }> };
        };
      }>('https://api.spotify.com/v1/me/player');

      if (!data || !data.item) {
        return { isPlaying: false };
      }

      return {
        isPlaying: Boolean(data.is_playing),
        trackId: data.item.id,
        trackTitle: data.item.name,
        artistName: data.item.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
        albumName: data.item.album?.name,
        albumArtUrl: data.item.album?.images?.[0]?.url,
        progressMs: data.progress_ms || 0,
        durationMs: data.item.duration_ms || 0,
        spotifyUri: data.item.uri,
        deviceName: data.device?.name || 'Active Spotify Client',
      };
    } catch {
      return { isPlaying: false };
    }
  }

  async search(query: string): Promise<{ artists: Artist[]; tracks: Track[]; albums: Album[] }> {
    const q = query.toLowerCase().trim();
    if (!q) return { artists: [], tracks: [], albums: [] };

    const status = await this.getStatus();
    if (!status.connected) {
      return { artists: [], tracks: [], albums: [] };
    }

    try {
      const token = localStorage.getItem('sonara_spotify_access_token');
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist,track,album&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return { artists: [], tracks: [], albums: [] };

      const data = await res.json();
      const artists: Artist[] = (data.artists?.items || []).map((a: { id: string; name: string; genres?: string[]; images?: Array<{ url: string }>; popularity?: number }) => ({
        id: `spot_art_${a.id}`,
        name: a.name,
        genres: (a.genres || []).map((g: string) => g.charAt(0).toUpperCase() + g.slice(1)),
        artworkUrl: a.images?.[0]?.url,
        providerId: a.id,
        source: 'spotify' as const,
        prominence: a.popularity || 50,
      }));

      const tracks: Track[] = (data.tracks?.items || []).map((t: { id: string; name: string; artists: Array<{ id: string }>; album?: { id: string }; duration_ms: number; preview_url?: string }) => ({
        id: `spot_trk_${t.id}`,
        title: t.name,
        artistIds: t.artists.map((a) => `spot_art_${a.id}`),
        albumId: t.album?.id ? `spot_alb_${t.album.id}` : undefined,
        durationMs: t.duration_ms,
        previewUrl: t.preview_url || undefined,
        source: 'spotify' as const,
      }));

      const albums: Album[] = (data.albums?.items || []).map((alb: { id: string; name: string; artists?: Array<{ id: string }>; release_date?: string; images?: Array<{ url: string }> }) => ({
        id: `spot_alb_${alb.id}`,
        title: alb.name,
        artistIds: (alb.artists || []).map((a) => `spot_art_${a.id}`),
        releaseYear: parseInt(alb.release_date?.slice(0, 4) || '2024'),
        artworkUrl: alb.images?.[0]?.url,
        source: 'spotify' as const,
      }));

      return { artists, tracks, albums };
    } catch {
      return { artists: [], tracks: [], albums: [] };
    }
  }
}

