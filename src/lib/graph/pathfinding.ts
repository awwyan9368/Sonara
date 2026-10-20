import { Relationship, JourneyStepExplanation } from '@/types';

export interface GraphEdge {
  targetId: string;
  relationship: Relationship;
  weight: number; // For Dijkstra: lower weight = stronger connection
}

export interface PathResult {
  found: boolean;
  path: string[]; // List of artist IDs from start to destination
  explanations: JourneyStepExplanation[];
  totalDistance: number;
  reason?: string;
}

export class MusicGraph {
  private adjacencyList: Map<string, GraphEdge[]> = new Map();

  constructor(relationships: Relationship[]) {
    this.buildGraph(relationships);
  }

  private buildGraph(relationships: Relationship[]): void {
    this.adjacencyList.clear();

    for (const rel of relationships) {
      if (!this.adjacencyList.has(rel.sourceId)) {
        this.adjacencyList.set(rel.sourceId, []);
      }
      if (!this.adjacencyList.has(rel.targetId)) {
        this.adjacencyList.set(rel.targetId, []);
      }

      // Weight is inverted from score: high score (e.g. 0.95) -> low cost (e.g. 0.05)
      const cost = Math.max(0.01, 1 - rel.score);

      // Undirected musical connections for exploration
      this.adjacencyList.get(rel.sourceId)!.push({
        targetId: rel.targetId,
        relationship: rel,
        weight: cost,
      });

      this.adjacencyList.get(rel.targetId)!.push({
        targetId: rel.sourceId,
        relationship: rel,
        weight: cost,
      });
    }
  }

  /**
   * Find shortest path using Breadth-First Search (unweighted hop count)
   */
  public findShortestPath(startArtistId: string, destArtistId: string): PathResult {
    if (startArtistId === destArtistId) {
      return {
        found: true,
        path: [startArtistId],
        explanations: [],
        totalDistance: 0,
      };
    }

    if (!this.adjacencyList.has(startArtistId) || !this.adjacencyList.has(destArtistId)) {
      return {
        found: false,
        path: [],
        explanations: [],
        totalDistance: Infinity,
        reason: 'One or both artists have no known network relationships in this dataset.',
      };
    }

    const queue: string[] = [startArtistId];
    const visited = new Set<string>([startArtistId]);
    const previous = new Map<string, { from: string; rel: Relationship }>();

    let reached = false;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === destArtistId) {
        reached = true;
        break;
      }

      const neighbors = this.adjacencyList.get(current) || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          previous.set(edge.targetId, { from: current, rel: edge.relationship });
          queue.push(edge.targetId);
        }
      }
    }

    if (!reached) {
      return {
        found: false,
        path: [],
        explanations: [],
        totalDistance: Infinity,
        reason: 'No traversable musical path exists between these two artists in the current dataset.',
      };
    }

    // Reconstruct path
    const path: string[] = [destArtistId];
    const explanations: JourneyStepExplanation[] = [];
    let curr = destArtistId;

    while (curr !== startArtistId) {
      const step = previous.get(curr)!;
      path.unshift(step.from);
      explanations.unshift({
        fromId: step.from,
        toId: curr,
        type: step.rel.type,
        explanation: step.rel.explanation,
      });
      curr = step.from;
    }

    return {
      found: true,
      path,
      explanations,
      totalDistance: path.length - 1,
    };
  }

  /**
   * Find strongest affinity path using Dijkstra's algorithm (weighted by edge score)
   */
  public findOptimalAffinityPath(startArtistId: string, destArtistId: string): PathResult {
    if (startArtistId === destArtistId) {
      return {
        found: true,
        path: [startArtistId],
        explanations: [],
        totalDistance: 0,
      };
    }

    if (!this.adjacencyList.has(startArtistId) || !this.adjacencyList.has(destArtistId)) {
      return {
        found: false,
        path: [],
        explanations: [],
        totalDistance: Infinity,
        reason: 'One or both artists have no known network relationships in this dataset.',
      };
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, { from: string; rel: Relationship }>();
    const unvisited = new Set<string>();

    for (const node of this.adjacencyList.keys()) {
      distances.set(node, Infinity);
      unvisited.add(node);
    }
    distances.set(startArtistId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;

      for (const node of unvisited) {
        const dist = distances.get(node) ?? Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          current = node;
        }
      }

      if (current === null || minDistance === Infinity) {
        break; // Remaining nodes are unreachable
      }

      if (current === destArtistId) {
        break; // Reached destination
      }

      unvisited.delete(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const edge of neighbors) {
        if (unvisited.has(edge.targetId)) {
          const candidateDist = minDistance + edge.weight;
          if (candidateDist < (distances.get(edge.targetId) ?? Infinity)) {
            distances.set(edge.targetId, candidateDist);
            previous.set(edge.targetId, { from: current, rel: edge.relationship });
          }
        }
      }
    }

    if (!previous.has(destArtistId)) {
      return {
        found: false,
        path: [],
        explanations: [],
        totalDistance: Infinity,
        reason: 'No traversable musical path exists between these two artists in the current dataset.',
      };
    }

    const path: string[] = [destArtistId];
    const explanations: JourneyStepExplanation[] = [];
    let curr = destArtistId;

    while (curr !== startArtistId) {
      const step = previous.get(curr)!;
      path.unshift(step.from);
      explanations.unshift({
        fromId: step.from,
        toId: curr,
        type: step.rel.type,
        explanation: step.rel.explanation,
      });
      curr = step.from;
    }

    return {
      found: true,
      path,
      explanations,
      totalDistance: distances.get(destArtistId) ?? path.length - 1,
    };
  }

  /**
   * Get direct neighbors for an artist
   */
  public getNeighbors(artistId: string): Array<{ artistId: string; relationship: Relationship }> {
    const edges = this.adjacencyList.get(artistId) || [];
    return edges.map((e) => ({
      artistId: e.targetId,
      relationship: e.relationship,
    }));
  }
}

