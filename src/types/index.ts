export type EntitySource = 'demo' | 'user' | 'spotify';

export type RelationshipType = 
  | 'collaborator' 
  | 'genre_kin' 
  | 'influence' 
  | 'era_contemporary' 
  | 'stylistic_sibling';

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  artworkUrl?: string;
  providerId?: string;
  source: EntitySource;
  externalUrls?: Record<string, string>;
  prominence: number; // 1-100 calculated library prominence
  clusterId?: string;
  position?: [number, number, number];
  bio?: string;
}

export interface Album {
  id: string;
  title: string;
  artistIds: string[];
  releaseYear?: number;
  artworkUrl?: string;
  source: EntitySource;
}

export interface TrackAudioFeatures {
  danceability?: number;
  energy?: number;
  valence?: number;
  tempo?: number;
  acousticness?: number;
}

export interface Track {
  id: string;
  title: string;
  artistIds: string[];
  albumId?: string;
  durationMs?: number;
  previewUrl?: string;
  localAudioFileId?: string;
  audioFeatures?: TrackAudioFeatures;
  source: EntitySource;
  orbitRadius?: number;
  orbitSpeed?: number;
  planetColor?: string;
  planetSize?: number;
  hasRings?: boolean;
}

export interface Genre {
  id: string;
  name: string;
  artistIds: string[];
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  score: number; // 0 to 1
  provenance: string;
  explanation: string;
}

export interface TasteCluster {
  id: string;
  label: string;
  color: string;
  description: string;
  memberArtistIds: string[];
  center: [number, number, number];
  radius: number;
  metrics: {
    avgProminence: number;
    dominantGenres: string[];
    artistCount: number;
    trackCount: number;
  };
  algorithmVersion: string;
}

export interface JourneyStepExplanation {
  fromId: string;
  toId: string;
  type: RelationshipType;
  explanation: string;
}

export interface Journey {
  id: string;
  startArtistId: string;
  destinationArtistId: string;
  orderedPath: string[]; // artist IDs
  relationshipExplanations: JourneyStepExplanation[];
  createdAt: string;
  title?: string;
}

export interface TasteInsightTopGenre {
  name: string;
  count: number;
  percentage: number;
}

export interface BridgeArtistInsight {
  artistId: string;
  artistName: string;
  connectsClusters: string[];
  explanation: string;
}

export interface TasteSnapshot {
  id: string;
  timestamp: string;
  datasetFingerprint: string;
  algorithmVersion: string;
  computedMetrics: {
    totalArtists: number;
    totalTracks: number;
    totalGenres: number;
    clusterCount: number;
    diversityScore: number; // 0 to 1 normalized Simpson/Shannon diversity
    topGenres: TasteInsightTopGenre[];
    bridgeArtists: BridgeArtistInsight[];
  };
  clusterReferences: string[];
}

export interface UserPreferences {
  visualQuality: 'low' | 'medium' | 'high';
  particleDensity: number; // 0.2 to 2.0
  bloomIntensity: number; // 0 to 1
  backgroundMotion: boolean;
  cameraSensitivity: number; // 0.5 to 2.0
  labelDensity: 'minimal' | 'balanced' | 'all';
  audioSensitivity: number; // 0.5 to 3.0
  defaultPreset: 'cosmic_pulse' | 'nebula_flow' | 'stellar_geometry';
  reducedMotion: boolean;
  explorationMode: '3d' | 'accessible_list';
  activeProvider: EntitySource;
}

export interface MusicUniverseData {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  relationships: Relationship[];
  clusters: TasteCluster[];
}

