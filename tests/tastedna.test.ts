import { describe, it, expect } from 'vitest';
import {
  calculateLibraryDiversity,
  findBridgeArtists,
  analyzeTasteDna,
} from '@/features/tastedna/algorithms/tasteEngine';
import {
  DEMO_ARTISTS,
  DEMO_TRACKS,
  DEMO_RELATIONSHIPS,
  DEMO_CLUSTERS,
} from '@/data/demo/universeData';

describe('TasteDNA Intelligence Engine', () => {
  it('calculates Simpson diversity index correctly', () => {
    // 4 genres with equal distribution
    const genreCounts = new Map([
      ['Ambient', 10],
      ['Techno', 10],
      ['Jazz', 10],
      ['Folk', 10],
    ]);
    const diversity = calculateLibraryDiversity(genreCounts, 40);
    // Simpson: 1 - sum((10/40)^2 * 4) = 1 - (4 * 0.0625) = 1 - 0.25 = 0.75
    expect(diversity).toBe(0.75);
  });

  it('identifies known bridge artists spanning multiple clusters', () => {
    const bridges = findBridgeArtists(
      DEMO_ARTISTS,
      DEMO_RELATIONSHIPS,
      DEMO_CLUSTERS
    );
    expect(bridges.length).toBeGreaterThan(0);
    const bridgeArtistIds = bridges.map((b) => b.artistId);

    // Sub-Zero Sub bridges Void Techno and Ambient Drift
    expect(bridgeArtistIds).toContain('art_sub_zero_sub');
  });

  it('computes full library analysis matching exact entity counts', () => {
    const analysis = analyzeTasteDna(
      DEMO_ARTISTS,
      DEMO_TRACKS,
      DEMO_RELATIONSHIPS,
      DEMO_CLUSTERS
    );

    expect(analysis.snapshot.computedMetrics.totalArtists).toBe(DEMO_ARTISTS.length);
    expect(analysis.snapshot.computedMetrics.totalTracks).toBe(DEMO_TRACKS.length);
    expect(analysis.clusterBreakdowns.length).toBe(DEMO_CLUSTERS.length);
    expect(analysis.discoverySuggestions.length).toBeGreaterThan(0);
    expect(analysis.topGenres.length).toBeGreaterThan(0);
  });
});

