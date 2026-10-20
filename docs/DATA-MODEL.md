# SONARA Data Model & Entity Specifications

## 1. Domain Entities

### Artist
Represents an individual artist or musical project (a Star in SoundGalaxy).
```typescript
interface Artist {
  id: string;               // Stable entity identifier (e.g. "art_lumen_void")
  name: string;             // Artist display name
  genres: string[];         // List of classified musical genres
  artworkUrl?: string;      // Optional licensed or procedural artwork
  providerId?: string;      // Optional external ID (e.g., Spotify URI)
  source: 'demo' | 'user' | 'spotify';
  prominence: number;       // 1-100 calculated library prominence score
  clusterId?: string;       // Assigned taste cluster ID
  position?: [number, number, number]; // 3D coordinates in universe
  bio?: string;             // Architectural provenance or bio
}
```

### Track
Represents a musical composition (an orbiting Planet around an Artist Star).
```typescript
interface Track {
  id: string;
  title: string;
  artistIds: string[];
  albumId?: string;
  durationMs?: number;
  previewUrl?: string;
  source: 'demo' | 'user' | 'spotify';
  orbitRadius?: number;     // Distance from parent star
  orbitSpeed?: number;      // Angular velocity
  planetColor?: string;     // Hex color code
  planetSize?: number;      // Radius in 3D units
  hasRings?: boolean;       // Whether to render planetary rings
}
```

### Relationship
Represents a verified artistic or musical link between two artists (a Constellation line).
```typescript
interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'collaborator' | 'genre_kin' | 'influence' | 'era_contemporary' | 'stylistic_sibling';
  score: number;            // 0.0 to 1.0 confidence / strength
  provenance: string;       // Verified real-world or historical justification
  explanation: string;      // Human-readable narrative explanation
}
```

### TasteCluster
Represents a harmonic region in the cosmos (a Nebula).
```typescript
interface TasteCluster {
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
```

### Journey
Represents a discovered and saved navigational route between two stars.
```typescript
interface Journey {
  id: string;
  startArtistId: string;
  destinationArtistId: string;
  orderedPath: string[];    // Array of artist IDs in traversal order
  relationshipExplanations: Array<{
    fromId: string;
    toId: string;
    type: RelationshipType;
    explanation: string;
  }>;
  createdAt: string;        // ISO 8601 timestamp
  title?: string;
}
```

## 2. Backup & Export Schema

Backups generated via `exportDatabaseBackup()` contain versioning and strict structure:
```json
{
  "app": "SONARA",
  "version": "1.0.0",
  "exportedAt": "2026-10-20T00:00:00.000Z",
  "data": {
    "artists": [],
    "albums": [],
    "tracks": [],
    "relationships": [],
    "clusters": [],
    "journeys": [],
    "snapshots": [],
    "preferences": {}
  }
}
```
Validation ensures no corrupted or unknown records overwrite the database.

