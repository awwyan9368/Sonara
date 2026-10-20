import { describe, it, expect } from 'vitest';
import {
  calculateGenreJaccard,
  computeArtistSimilarity,
} from '@/lib/graph/similarity';
import { Artist, Relationship } from '@/types';

describe('Similarity Algorithm Engine', () => {
  it('calculates exact Jaccard index for genre sets', () => {
    const genresA = ['Ambient', 'Drone', 'Space'];
    const genresB = ['Drone', 'Space', 'Techno'];
    // Intersection: Drone, Space (2). Union: Ambient, Drone, Space, Techno (4). Jaccard = 2/4 = 0.5
    const res = calculateGenreJaccard(genresA, genresB);
    expect(res.score).toBe(0.5);
    expect(res.shared).toEqual(['drone', 'space']);
  });

  it('handles empty genre arrays cleanly', () => {
    const res = calculateGenreJaccard([], ['Ambient']);
    expect(res.score).toBe(0);
    expect(res.shared).toHaveLength(0);
  });

  it('computes similarity of identical artist as 1.0', () => {
    const artistA: Artist = {
      id: 'art_test_1',
      name: 'Test Artist',
      genres: ['Synthwave'],
      source: 'demo',
      prominence: 80,
    };
    const res = computeArtistSimilarity(artistA, artistA, []);
    expect(res.overallScore).toBe(1.0);
  });

  it('normalizes missing audio features without fabricating values', () => {
    const artistA: Artist = {
      id: 'art_a',
      name: 'Artist A',
      genres: ['Cyberwave'],
      clusterId: 'cluster_synth',
      source: 'demo',
      prominence: 70,
    };
    const artistB: Artist = {
      id: 'art_b',
      name: 'Artist B',
      genres: ['Cyberwave', 'Outrun'],
      clusterId: 'cluster_synth',
      source: 'demo',
      prominence: 75,
    };

    const rel: Relationship = {
      id: 'rel_ab',
      sourceId: 'art_a',
      targetId: 'art_b',
      type: 'collaborator',
      score: 0.9,
      provenance: 'Co-producers',
      explanation: 'Studio collaboration',
    };

    // Tracks without audio features
    const sim = computeArtistSimilarity(artistA, artistB, [rel]);
    expect(sim.overallScore).toBeGreaterThan(0.6);
    expect(sim.signalsUsed.audioFeatureSimilarity).toBeUndefined(); // Missing signal omitted cleanly
    expect(sim.signalsUsed.genreSimilarity).toBeDefined();
    expect(sim.signalsUsed.relationshipAffinity).toBe(0.9);
  });
});

