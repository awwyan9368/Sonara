import {
  Artist,
  Track,
  Relationship,
  TasteCluster,
  TasteSnapshot,
  TasteInsightTopGenre,
  BridgeArtistInsight,
} from '@/types';
import { computeArtistSimilarity } from '@/lib/graph/similarity';

export interface ClusterBreakdown {
  clusterId: string;
  label: string;
  color: string;
  artistCount: number;
  percentage: number;
  topArtists: Artist[];
  dominantGenres: string[];
}

export interface TasteDnaAnalysis {
  snapshot: TasteSnapshot;
  clusterBreakdowns: ClusterBreakdown[];
  bridgeArtists: BridgeArtistInsight[];
  topGenres: TasteInsightTopGenre[];
  prominentArtists: Artist[];
  discoverySuggestions: Array<{
    artist: Artist;
    recommendedBecause: string;
    affinityScore: number;
    connectionChain: string[];
  }>;
}

/**
 * Calculates Simpson's Reciprocal Diversity Index normalized to [0, 1]
 * D = 1 - sum((n_i / N)^2)
 */
export function calculateLibraryDiversity(genreCounts: Map<string, number>, totalGenreOccurrences: number): number {
  if (totalGenreOccurrences === 0 || genreCounts.size <= 1) return 0;

  let sumProportionsSq = 0;
  for (const count of genreCounts.values()) {
    const p = count / totalGenreOccurrences;
    sumProportionsSq += p * p;
  }

  // Simpson's Index of Diversity (1 - D): ranges from 0 (all same genre) to 1 (infinitely diverse)
  const diversity = 1 - sumProportionsSq;
  return Math.round(diversity * 1000) / 1000;
}

/**
 * Identifies "Bridge Artists": artists whose relationships span across 2 or more distinct taste clusters
 */
export function findBridgeArtists(
  artists: Artist[],
  relationships: Relationship[],
  clusters: TasteCluster[]
): BridgeArtistInsight[] {
  const clusterMap = new Map(clusters.map((c) => [c.id, c.label]));
  const artistClusterMap = new Map(artists.map((a) => [a.id, a.clusterId]));
  const artistNameMap = new Map(artists.map((a) => [a.id, a.name]));

  const bridges: BridgeArtistInsight[] = [];

  for (const artist of artists) {
    const connectedClusters = new Set<string>();
    if (artist.clusterId) {
      connectedClusters.add(artist.clusterId);
    }

    const artistRels = relationships.filter(
      (r) => r.sourceId === artist.id || r.targetId === artist.id
    );

    for (const rel of artistRels) {
      const otherId = rel.sourceId === artist.id ? rel.targetId : rel.sourceId;
      const otherCluster = artistClusterMap.get(otherId);
      if (otherCluster) {
        connectedClusters.add(otherCluster);
      }
    }

    if (connectedClusters.size >= 2) {
      const clusterNames = Array.from(connectedClusters).map(
        (id) => clusterMap.get(id) || id
      );
      bridges.push({
        artistId: artist.id,
        artistName: artist.name,
        connectsClusters: Array.from(connectedClusters),
        explanation: `${artist.name} bridges ${clusterNames.slice(0, 2).join(' and ')} through verified artistic collaborations and stylistic affinities.`,
      });
    }
  }

  return bridges;
}

/**
 * Main TasteDNA Analysis Execution
 */
export function analyzeTasteDna(
  artists: Artist[],
  tracks: Track[],
  relationships: Relationship[],
  clusters: TasteCluster[]
): TasteDnaAnalysis {
  const totalArtists = artists.length;
  const totalTracks = tracks.length;

  // 1. Genre distributions
  const genreCounts = new Map<string, number>();
  let totalGenreOccurrences = 0;

  for (const a of artists) {
    for (const g of a.genres) {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      totalGenreOccurrences++;
    }
  }

  const sortedGenres = Array.from(genreCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalGenreOccurrences > 0 ? Math.round((count / totalGenreOccurrences) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const diversityScore = calculateLibraryDiversity(genreCounts, totalGenreOccurrences);

  // 2. Cluster breakdowns
  const clusterBreakdowns: ClusterBreakdown[] = clusters.map((cluster) => {
    const memberArtists = artists.filter(
      (a) => a.clusterId === cluster.id || (cluster.memberArtistIds || []).includes(a.id)
    );
    const percentage = totalArtists > 0 ? Math.round((memberArtists.length / totalArtists) * 1000) / 10 : 0;
    const sortedMembers = [...memberArtists].sort((a, b) => b.prominence - a.prominence);

    return {
      clusterId: cluster.id,
      label: cluster.label,
      color: cluster.color,
      artistCount: memberArtists.length,
      percentage,
      topArtists: sortedMembers.slice(0, 4),
      dominantGenres: cluster.metrics.dominantGenres,
    };
  });

  // 3. Bridge artists
  const bridgeArtists = findBridgeArtists(artists, relationships, clusters);

  // 4. Prominent artists
  const prominentArtists = [...artists].sort((a, b) => b.prominence - a.prominence).slice(0, 6);

  // 5. Discovery suggestions (artists with strong similarity to high prominence artists)
  const topSeeds = prominentArtists.slice(0, 3);
  const discoverySuggestions: TasteDnaAnalysis['discoverySuggestions'] = [];
  const seenIds = new Set<string>(topSeeds.map((a) => a.id));

  for (const seed of topSeeds) {
    for (const candidate of artists) {
      if (seenIds.has(candidate.id)) continue;

      const sim = computeArtistSimilarity(seed, candidate, relationships);
      if (sim.overallScore > 0.4) {
        discoverySuggestions.push({
          artist: candidate,
          recommendedBecause: `Strong affinity with ${seed.name}: ${sim.explanation}`,
          affinityScore: sim.overallScore,
          connectionChain: [seed.name, candidate.name],
        });
        seenIds.add(candidate.id);
      }
    }
  }

  discoverySuggestions.sort((a, b) => b.affinityScore - a.affinityScore);

  // 6. Assemble snapshot
  const snapshot: TasteSnapshot = {
    id: `snap_${Date.now()}`,
    timestamp: new Date().toISOString(),
    datasetFingerprint: `art-${totalArtists}_trk-${totalTracks}`,
    algorithmVersion: 'tastedna-v1.0.0',
    computedMetrics: {
      totalArtists,
      totalTracks,
      totalGenres: genreCounts.size,
      clusterCount: clusters.length,
      diversityScore,
      topGenres: sortedGenres.slice(0, 8),
      bridgeArtists: bridgeArtists.slice(0, 5),
    },
    clusterReferences: clusters.map((c) => c.id),
  };

  return {
    snapshot,
    clusterBreakdowns,
    bridgeArtists,
    topGenres: sortedGenres.slice(0, 10),
    prominentArtists,
    discoverySuggestions: discoverySuggestions.slice(0, 6),
  };
}

