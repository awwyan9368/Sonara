import { describe, it, expect } from 'vitest';
import { MusicGraph } from '@/lib/graph/pathfinding';
import { DEMO_RELATIONSHIPS } from './fixtures/testUniverseData';

describe('MusicGraph Pathfinding Engine', () => {
  const graph = new MusicGraph(DEMO_RELATIONSHIPS);

  it('finds direct 1-hop path between directly related artists', () => {
    const result = graph.findShortestPath('art_lumen_void', 'art_helios_drift');
    expect(result.found).toBe(true);
    expect(result.path).toEqual(['art_lumen_void', 'art_helios_drift']);
    expect(result.explanations).toHaveLength(1);
    expect(result.explanations[0].type).toBe('stylistic_sibling');
  });

  it('finds multi-hop path across clusters via bridge artists', () => {
    // Lumen Void (Ambient) -> Sub-Zero Sub (Techno) -> Graviton Beat (Techno)
    const result = graph.findOptimalAffinityPath('art_lumen_void', 'art_graviton_beat');
    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThanOrEqual(3);
    expect(result.path[0]).toBe('art_lumen_void');
    expect(result.path[result.path.length - 1]).toBe('art_graviton_beat');
  });

  it('correctly handles identical start and destination', () => {
    const result = graph.findShortestPath('art_vector_pulse', 'art_vector_pulse');
    expect(result.found).toBe(true);
    expect(result.path).toEqual(['art_vector_pulse']);
    expect(result.explanations).toHaveLength(0);
    expect(result.totalDistance).toBe(0);
  });

  it('honestly reports no path when traversing to disconnected entities', () => {
    // art_seti_monolith is deliberately isolated from the main music universe
    const result = graph.findOptimalAffinityPath('art_lumen_void', 'art_seti_monolith');
    expect(result.found).toBe(false);
    expect(result.path).toHaveLength(0);
    expect(result.reason).toContain('No traversable musical path exists');
  });

  it('returns valid neighbors for a given artist', () => {
    const neighbors = graph.getNeighbors('art_vector_pulse');
    expect(neighbors.length).toBeGreaterThan(0);
    const neighborIds = neighbors.map((n) => n.artistId);
    expect(neighborIds).toContain('art_chroma_circuit');
  });
});

