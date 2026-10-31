import { describe, it, expect } from 'vitest';
import { buildSpotifyUniverseData, SpotifyRawArtist, SpotifyRawTrack } from '@/features/music/spotify/spotifyMapper';

describe('Spotify Universe Data Mapper & Astronomical Hierarchy', () => {
  const mockRawArtists: SpotifyRawArtist[] = [
    {
      id: 'art_radiohead',
      name: 'Radiohead',
      genres: ['alternative rock', 'art rock', 'melancholia', 'oxford indie'],
      popularity: 82,
      images: [{ url: 'https://i.scdn.co/image/radiohead.jpg' }],
      followers: { total: 8500000 },
    },
    {
      id: 'art_daft_punk',
      name: 'Daft Punk',
      genres: ['electro', 'filter house', 'french synth', 'edm'],
      popularity: 85,
      images: [{ url: 'https://i.scdn.co/image/daftpunk.jpg' }],
      followers: { total: 11000000 },
    },
    {
      id: 'art_kendrick',
      name: 'Kendrick Lamar',
      genres: ['conscious hip hop', 'west coast rap', 'hip hop'],
      popularity: 90,
      images: [{ url: 'https://i.scdn.co/image/kendrick.jpg' }],
      followers: { total: 25000000 },
    },
    {
      id: 'art_obscure_indie',
      name: 'Mysterious Ambient Trio',
      genres: [], // Zero genres available
      popularity: 30,
      images: [],
    },
  ];

  const mockRawTracks: SpotifyRawTrack[] = [
    {
      id: 'trk_paranoid_android',
      name: 'Paranoid Android',
      duration_ms: 387000,
      popularity: 78,
      preview_url: 'https://p.scdn.co/mp3-preview/paranoid.mp3',
      artists: [{ id: 'art_radiohead', name: 'Radiohead' }],
      album: {
        id: 'alb_ok_computer',
        name: 'OK Computer',
        release_date: '1997-05-21',
        images: [{ url: 'https://i.scdn.co/image/okcomputer.jpg' }],
      },
    },
    {
      id: 'trk_one_more_time',
      name: 'One More Time',
      duration_ms: 320000,
      popularity: 80,
      preview_url: 'https://p.scdn.co/mp3-preview/onemoretime.mp3',
      artists: [{ id: 'art_daft_punk', name: 'Daft Punk' }],
      album: {
        id: 'alb_discovery',
        name: 'Discovery',
        release_date: '2001-03-12',
        images: [{ url: 'https://i.scdn.co/image/discovery.jpg' }],
      },
    },
    {
      id: 'trk_catalog_rare',
      name: 'Rare B-Side',
      duration_ms: 210000,
      popularity: 40,
      artists: [{ id: 'art_obscure_indie', name: 'Mysterious Ambient Trio' }],
      album: {
        id: 'alb_demo',
        name: 'EP 1',
        images: [],
      },
    },
  ];

  it('maps raw Spotify data into 3D clusters, stars, and planets with strict classification', () => {
    // Paranoid Android has 5 verified recent plays; One More Time has 2; Rare B-Side has 0
    const recentPlayCounts = new Map<string, number>([
      ['trk_paranoid_android', 5],
      ['trk_one_more_time', 2],
    ]);

    const universe = buildSpotifyUniverseData(mockRawArtists, mockRawTracks, recentPlayCounts);

    // 1. Artists
    expect(universe.artists.length).toBe(4);
    const radiohead = universe.artists.find((a) => a.id === 'spot_art_art_radiohead');
    expect(radiohead).toBeDefined();
    expect(radiohead?.classificationState).toBe('verified_genre');
    expect(radiohead?.clusterId).toBe('cluster_rock_alt');

    const obscure = universe.artists.find((a) => a.id === 'spot_art_art_obscure_indie');
    expect(obscure).toBeDefined();
    // Unclassified artist goes strictly to unclassified galaxy, not a random fake genre
    expect(obscure?.classificationState).toBe('unclassified');
    expect(obscure?.clusterId).toBe('cluster_unclassified');

    // 2. Clusters (Galaxies)
    expect(universe.clusters.length).toBe(4); // Rock, Electronic, Hip-Hop, Unclassified
    const unclassifiedCluster = universe.clusters.find((c) => c.id === 'cluster_unclassified');
    expect(unclassifiedCluster).toBeDefined();
    expect(unclassifiedCluster?.label).toContain('Genre Unknown');

    // 3. Listening Frequency & Planet Sizing (Part 3)
    const paranoidAndroid = universe.tracks.find((t) => t.id === 'spot_trk_trk_paranoid_android');
    expect(paranoidAndroid).toBeDefined();
    expect(paranoidAndroid?.isFrequencyAvailable).toBe(true);
    expect(paranoidAndroid?.playCount).toBe(5);

    const oneMoreTime = universe.tracks.find((t) => t.id === 'spot_trk_trk_one_more_time');
    expect(oneMoreTime).toBeDefined();
    expect(oneMoreTime?.isFrequencyAvailable).toBe(true);
    expect(oneMoreTime?.playCount).toBe(2);

    // Frequently played track must be larger than less frequently played track
    expect(paranoidAndroid!.planetSize!).toBeGreaterThan(oneMoreTime!.planetSize!);

    const catalogTrack = universe.tracks.find((t) => t.id === 'spot_trk_trk_catalog_rare');
    expect(catalogTrack).toBeDefined();
    // Catalog track not in recently played has unavailable frequency and neutral default size
    expect(catalogTrack?.isFrequencyAvailable).toBe(false);
    expect(catalogTrack?.playCount).toBeUndefined();
    expect(catalogTrack?.planetSize).toBe(0.70);

    // 4. Spatial Invariants: Every song and artist remains strictly bounded inside their galaxy
    universe.artists.forEach((artist) => {
      const cluster = universe.clusters.find((c) => c.id === artist.clusterId);
      expect(cluster).toBeDefined();
      const distFromCenter = Math.hypot(
        artist.position![0] - cluster!.center[0],
        artist.position![2] - cluster!.center[2]
      );
      // Artist system is inside cluster bounding radius
      expect(distFromCenter).toBeLessThanOrEqual(cluster!.radius);
    });

    universe.tracks.forEach((track) => {
      const cluster = universe.clusters.find((c) => c.id === track.parentClusterId);
      expect(cluster).toBeDefined();
      if (track.position) {
        const distFromCenter = Math.hypot(
          track.position[0] - cluster!.center[0],
          track.position[2] - cluster!.center[2]
        );
        // Track planet is inside cluster bounding radius (no stray genre planets!)
        expect(distFromCenter).toBeLessThanOrEqual(cluster!.radius + 5.0);
      }
    });
  });

  it('handles empty Spotify responses cleanly with zero fake planets', () => {
    const emptyUniverse = buildSpotifyUniverseData([], []);
    expect(emptyUniverse.artists).toHaveLength(0);
    expect(emptyUniverse.tracks).toHaveLength(0);
    expect(emptyUniverse.clusters).toHaveLength(0);
    expect(emptyUniverse.relationships).toHaveLength(0);
  });
});
