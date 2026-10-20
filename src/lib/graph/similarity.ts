import { Artist, Relationship, Track } from '@/types';

export interface SimilarityWeights {
  genres: number;
  relationships: number;
  cluster: number;
  audioFeatures: number;
}

export const DEFAULT_SIMILARITY_WEIGHTS: SimilarityWeights = {
  genres: 0.35,
  relationships: 0.35,
  cluster: 0.15,
  audioFeatures: 0.15,
};

export interface SimilarityBreakdown {
  overallScore: number; // 0 to 1
  signalsUsed: {
    genreSimilarity?: number;
    relationshipAffinity?: number;
    clusterMatch?: number;
    audioFeatureSimilarity?: number;
  };
  sharedGenres: string[];
  connectingRelationships: Relationship[];
  explanation: string;
}

/**
 * Calculates Jaccard similarity coefficient between two sets of genres: |A ∩ B| / |A ∪ B|
 */
export function calculateGenreJaccard(genresA: string[], genresB: string[]): { score: number; shared: string[] } {
  if (!genresA?.length || !genresB?.length) {
    return { score: 0, shared: [] };
  }

  const setA = new Set(genresA.map((g) => g.toLowerCase().trim()));
  const setB = new Set(genresB.map((g) => g.toLowerCase().trim()));

  const intersection: string[] = [];
  for (const g of setA) {
    if (setB.has(g)) {
      intersection.push(g);
    }
  }

  const union = new Set([...setA, ...setB]);
  const score = union.size > 0 ? intersection.length / union.size : 0;

  return { score, shared: intersection };
}

/**
 * Calculates cosine or Euclidean distance similarity over available audio features (0 to 1)
 */
export function calculateAudioFeatureSimilarity(tracksA: Track[], tracksB: Track[]): number | null {
  const getAvgFeatures = (tracks: Track[]) => {
    const valid = tracks.filter((t) => t.audioFeatures);
    if (valid.length === 0) return null;

    let energySum = 0, valenceSum = 0, danceabilitySum = 0, acousticnessSum = 0;
    for (const t of valid) {
      const f = t.audioFeatures!;
      energySum += f.energy ?? 0.5;
      valenceSum += f.valence ?? 0.5;
      danceabilitySum += f.danceability ?? 0.5;
      acousticnessSum += f.acousticness ?? 0.5;
    }
    const count = valid.length;
    return [energySum / count, valenceSum / count, danceabilitySum / count, acousticnessSum / count];
  };

  const featA = getAvgFeatures(tracksA);
  const featB = getAvgFeatures(tracksB);

  if (!featA || !featB) return null;

  // Normalized Euclidean distance: 1 - (dist / maxPossibleDist)
  let sumSq = 0;
  for (let i = 0; i < featA.length; i++) {
    sumSq += Math.pow(featA[i] - featB[i], 2);
  }
  const dist = Math.sqrt(sumSq);
  const maxDist = 2; // sqrt(4 * 1^2)
  return Math.max(0, Math.min(1, 1 - dist / maxDist));
}

/**
 * Modular Normalized Similarity Engine
 */
export function computeArtistSimilarity(
  artistA: Artist,
  artistB: Artist,
  allRelationships: Relationship[],
  tracksA: Track[] = [],
  tracksB: Track[] = [],
  customWeights: Partial<SimilarityWeights> = {}
): SimilarityBreakdown {
  if (artistA.id === artistB.id) {
    return {
      overallScore: 1.0,
      signalsUsed: { genreSimilarity: 1, relationshipAffinity: 1, clusterMatch: 1 },
      sharedGenres: artistA.genres,
      connectingRelationships: [],
      explanation: 'Identical artist entity.',
    };
  }

  const weights = { ...DEFAULT_SIMILARITY_WEIGHTS, ...customWeights };

  // 1. Genre signal
  const genreRes = calculateGenreJaccard(artistA.genres, artistB.genres);

  // 2. Direct relationships
  const connecting = allRelationships.filter(
    (r) =>
      (r.sourceId === artistA.id && r.targetId === artistB.id) ||
      (r.sourceId === artistB.id && r.targetId === artistA.id)
  );

  let relScore = 0;
  if (connecting.length > 0) {
    const maxScore = Math.max(...connecting.map((r) => r.score));
    relScore = maxScore;
  }

  // 3. Cluster signal
  const clusterScore =
    artistA.clusterId && artistB.clusterId && artistA.clusterId === artistB.clusterId ? 1.0 : 0.0;

  // 4. Audio features (if available)
  const audioScore = calculateAudioFeatureSimilarity(tracksA, tracksB);

  // Normalization of weights over strictly AVAILABLE signals
  let effectiveWeightSum = 0;
  let weightedScoreSum = 0;
  const signalsUsed: SimilarityBreakdown['signalsUsed'] = {};

  // Genres (always available if at least one genre exists)
  effectiveWeightSum += weights.genres;
  weightedScoreSum += genreRes.score * weights.genres;
  signalsUsed.genreSimilarity = genreRes.score;

  // Relationships (always available as a signal: 0 if unconnected, >0 if connected)
  effectiveWeightSum += weights.relationships;
  weightedScoreSum += relScore * weights.relationships;
  signalsUsed.relationshipAffinity = relScore;

  // Cluster
  effectiveWeightSum += weights.cluster;
  weightedScoreSum += clusterScore * weights.cluster;
  signalsUsed.clusterMatch = clusterScore;

  // Audio features
  if (audioScore !== null) {
    effectiveWeightSum += weights.audioFeatures;
    weightedScoreSum += audioScore * weights.audioFeatures;
    signalsUsed.audioFeatureSimilarity = audioScore;
  }

  const overallScore = effectiveWeightSum > 0 ? weightedScoreSum / effectiveWeightSum : 0;

  // Construct explanation based on actual signals
  const reasons: string[] = [];
  if (genreRes.shared.length > 0) {
    reasons.push(`Share ${genreRes.shared.length} genre(s): ${genreRes.shared.slice(0, 3).join(', ')}`);
  }
  if (connecting.length > 0) {
    reasons.push(connecting[0].explanation);
  }
  if (clusterScore > 0) {
    reasons.push('Belong to the same harmonic galaxy cluster');
  }
  if (audioScore !== null && audioScore > 0.75) {
    reasons.push('Exhibit highly aligned acoustic audio features');
  }

  const explanation =
    reasons.length > 0
      ? reasons.join('. ') + '.'
      : 'No direct genre or collaborator overlap identified in current dataset.';

  return {
    overallScore: Math.round(overallScore * 1000) / 1000,
    signalsUsed,
    sharedGenres: genreRes.shared,
    connectingRelationships: connecting,
    explanation,
  };
}
