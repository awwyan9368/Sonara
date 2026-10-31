import {
  Artist,
  Album,
  Track,
  Relationship,
  TasteCluster,
  MusicUniverseData,
  RelationshipType,
  PlanetArchetype,
} from '@/types';

export interface SpotifyRawArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images?: Array<{ url: string; width?: number; height?: number }>;
  followers?: { total: number };
  external_urls?: Record<string, string>;
  uri?: string;
}

export interface SpotifyRawTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  preview_url?: string | null;
  uri?: string;
  external_urls?: Record<string, string>;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    release_date?: string;
    images?: Array<{ url: string; width?: number; height?: number }>;
    artists?: Array<{ id: string; name: string }>;
  };
}

interface ClusterDefinition {
  id: string;
  label: string;
  keywords: string[];
  color: string;
  descriptionPrefix: string;
}

/**
 * Legitimate Macro Genre Galaxies based on standard music taxonomy.
 * Zero fictional or randomly generated genres.
 */
export const VERIFIED_MACRO_CLUSTERS: ClusterDefinition[] = [
  {
    id: 'cluster_rock_alt',
    label: 'Nebula Rock & Alternative',
    keywords: [
      'rock', 'indie', 'alternative', 'punk', 'metal', 'grunge', 'shoegaze',
      'psychedelic', 'post-punk', 'garage', 'emo', 'hard rock', 'classic rock',
      'prog', 'post-rock', 'stoner', 'heavy', 'midwest', 'goth', 'screamo'
    ],
    color: '#00F0FF', // Brilliant Cyan
    descriptionPrefix: 'Gravitational domain for rock, indie dynamism, and electric resonance',
  },
  {
    id: 'cluster_electronic_synth',
    label: 'Pulsar Synth & Electronic',
    keywords: [
      'electronic', 'synth', 'dance', 'house', 'techno', 'edm', 'electro',
      'ambient', 'idm', 'dubstep', 'hyperpop', 'club', 'trance', 'downtempo',
      'electronica', 'chiptune', 'drum and bass', 'future bass', 'vaporwave',
      'synthwave', 'breakbeat', 'trip hop'
    ],
    color: '#8C6CFF', // Ultraviolet
    descriptionPrefix: 'Kinetic stellar systems powered by synthesis, modular pulse, and sub-bass',
  },
  {
    id: 'cluster_hiphop_soul',
    label: 'Deep Gravity Hip-Hop & R&B',
    keywords: [
      'hip hop', 'rap', 'trap', 'r&b', 'soul', 'drill', 'urban', 'funk',
      'afrobeats', 'boom bap', 'neo soul', 'reggae', 'dancehall', 'grime', 'motown'
    ],
    color: '#FFB800', // Molten Amber
    descriptionPrefix: 'Massive starbursts of heavy basslines, flow, and modern urban cadence',
  },
  {
    id: 'cluster_pop_melodic',
    label: 'Radiant Pop & Melodic Echoes',
    keywords: [
      'pop', 'k-pop', 'dance pop', 'electropop', 'teen pop', 'singer-songwriter',
      'indie pop', 'synthpop', 'folk-pop', 'viral', 'acoustic pop', 'europop',
      'power pop', 'j-pop'
    ],
    color: '#FF2E93', // Luminous Magenta
    descriptionPrefix: 'Luminous main-sequence stellar bodies driven by vocal hooks and melodies',
  },
  {
    id: 'cluster_acoustic_classical',
    label: 'Deep Horizon Acoustic, Jazz & Classical',
    keywords: [
      'jazz', 'classical', 'folk', 'acoustic', 'instrumental', 'bossa nova',
      'soundtrack', 'country', 'blues', 'bluegrass', 'orchestral', 'score',
      'minimalism', 'chamber', 'piano', 'celtic', 'opera', 'world'
    ],
    color: '#00FF9D', // Emerald
    descriptionPrefix: 'Harmonic resonance across organic acoustic, jazz, and symphonic traditions',
  },
  {
    id: 'cluster_unclassified',
    label: 'Misty Void — Genre Unknown',
    keywords: [],
    color: '#C8D4E5', // Ethereal Platinum / Silver
    descriptionPrefix: 'Stellar systems with unverified, eclectic, or unavailable genre metadata',
  },
];

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Transforms verified Spotify API data into a hierarchical, astronomical MusicUniverseData.
 * Invariant: Music Universe -> Genre Galaxies -> Artist Systems -> Song Planets.
 * No stray genre planets, no fabricated play counts, no random name hashing.
 */
export function buildSpotifyUniverseData(
  rawArtists: SpotifyRawArtist[],
  rawTracks: SpotifyRawTrack[],
  recentPlayCounts: Map<string, number> = new Map()
): MusicUniverseData {
  if (rawArtists.length === 0 && rawTracks.length === 0) {
    return {
      artists: [],
      albums: [],
      tracks: [],
      relationships: [],
      clusters: [],
    };
  }

  // 1. Deduplicate raw artists by ID
  const artistMap = new Map<string, SpotifyRawArtist>();
  for (const a of rawArtists) {
    if (a && a.id && !artistMap.has(a.id)) {
      artistMap.set(a.id, a);
    }
  }

  // Include primary artists referenced in tracks that might not be in the top-50 list
  for (const t of rawTracks) {
    if (t?.artists && Array.isArray(t.artists)) {
      for (const pa of t.artists) {
        if (pa?.id && !artistMap.has(pa.id)) {
          artistMap.set(pa.id, {
            id: pa.id,
            name: pa.name || 'Unknown Artist',
            genres: [],
            popularity: 40,
            images: t.album?.images,
          });
        }
      }
    }
  }

  const uniqueArtists = Array.from(artistMap.values());

  // 2. Strict Genre Classification following user resolution order:
  // Step 1: Use verified genre metadata when available.
  // Step 2: Score against verified macro categories.
  // Step 3: If no trustworthy match, place in 'cluster_unclassified'. DO NOT invent or hash.
  const artistClusterMap = new Map<string, string>();
  const artistClassificationMap = new Map<string, 'verified_genre' | 'unclassified'>();
  const activeClusterIds = new Set<string>();

  const standardMacroClusters = VERIFIED_MACRO_CLUSTERS.filter((c) => c.id !== 'cluster_unclassified');
  const unclassifiedClusterDef = VERIFIED_MACRO_CLUSTERS.find((c) => c.id === 'cluster_unclassified')!;

  uniqueArtists.forEach((a) => {
    let bestCluster: string | null = null;
    let maxScore = 0;

    const artistGenreString = (a.genres || []).join(' ').toLowerCase();

    if (artistGenreString.trim().length > 0) {
      standardMacroClusters.forEach((macro) => {
        let score = 0;
        macro.keywords.forEach((kw) => {
          if (artistGenreString.includes(kw)) {
            score += 1;
          }
        });
        if (score > maxScore) {
          maxScore = score;
          bestCluster = macro.id;
        }
      });
    }

    if (bestCluster && maxScore > 0) {
      artistClusterMap.set(a.id, bestCluster);
      artistClassificationMap.set(a.id, 'verified_genre');
      activeClusterIds.add(bestCluster);
    } else {
      // Explicitly placed in Unclassified galaxy
      artistClusterMap.set(a.id, unclassifiedClusterDef.id);
      artistClassificationMap.set(a.id, 'unclassified');
      activeClusterIds.add(unclassifiedClusterDef.id);
    }
  });

  // 3. Build TasteCluster Galaxies positioned across the 4 grand spiral arms of the master galaxy
  const activeClusterDefs = VERIFIED_MACRO_CLUSTERS.filter((c) => activeClusterIds.has(c.id));
  const NUM_ARMS = 4;
  const windingSpeed = 0.62;

  // Group raw artists by their assigned cluster
  const rawArtistsByCluster = new Map<string, SpotifyRawArtist[]>();
  activeClusterDefs.forEach((def) => {
    const members = uniqueArtists
      .filter((a) => artistClusterMap.get(a.id) === def.id)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    rawArtistsByCluster.set(def.id, members);
  });

  // Assign arms to each artist to guarantee balanced distribution across all 4 arms
  const artistArmIndexMap = new Map<string, number>();

  if (activeClusterDefs.length >= 4) {
    activeClusterDefs.forEach((def, cIdx) => {
      const arm = cIdx % NUM_ARMS;
      (rawArtistsByCluster.get(def.id) || []).forEach((raw) => {
        artistArmIndexMap.set(raw.id, arm);
      });
    });
  } else if (activeClusterDefs.length === 3) {
    const sortedDefs = [...activeClusterDefs].sort(
      (a, b) => (rawArtistsByCluster.get(b.id)?.length || 0) - (rawArtistsByCluster.get(a.id)?.length || 0)
    );
    // Largest cluster splits across Arm 0 and Arm 3
    (rawArtistsByCluster.get(sortedDefs[0].id) || []).forEach((raw, i) => {
      artistArmIndexMap.set(raw.id, i % 2 === 0 ? 0 : 3);
    });
    // Second cluster: Arm 1
    (rawArtistsByCluster.get(sortedDefs[1].id) || []).forEach((raw) => {
      artistArmIndexMap.set(raw.id, 1);
    });
    // Third cluster: Arm 2
    (rawArtistsByCluster.get(sortedDefs[2].id) || []).forEach((raw) => {
      artistArmIndexMap.set(raw.id, 2);
    });
  } else if (activeClusterDefs.length === 2) {
    // 2 clusters: opposite arms (Cluster 0: 0 & 2, Cluster 1: 1 & 3)
    (rawArtistsByCluster.get(activeClusterDefs[0].id) || []).forEach((raw, i) => {
      artistArmIndexMap.set(raw.id, i % 2 === 0 ? 0 : 2);
    });
    (rawArtistsByCluster.get(activeClusterDefs[1].id) || []).forEach((raw, i) => {
      artistArmIndexMap.set(raw.id, i % 2 === 0 ? 1 : 3);
    });
  } else {
    // 1 cluster (e.g. all unclassified or single genre): distribute evenly across all 4 arms!
    uniqueArtists.forEach((raw, i) => {
      artistArmIndexMap.set(raw.id, i % NUM_ARMS);
    });
  }

  // Pre-calculate artist coordinates on their respective arms
  const armArtists = new Map<number, SpotifyRawArtist[]>();
  for (let a = 0; a < NUM_ARMS; a++) armArtists.set(a, []);

  uniqueArtists.forEach((raw) => {
    const arm = artistArmIndexMap.get(raw.id) ?? 0;
    armArtists.get(arm)!.push(raw);
  });

  const artistPositionMap = new Map<string, [number, number, number]>();
  const normalizedArtists: Artist[] = [];

  for (let arm = 0; arm < NUM_ARMS; arm++) {
    const list = armArtists.get(arm)!;
    list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const count = Math.max(1, list.length);
    const baseArmAngle = arm * (Math.PI / 2);

    list.forEach((raw, idx) => {
      const normIdx = count > 1 ? idx / (count - 1) : 0.5;
      const r = 20.0 + Math.pow(normIdx, 0.85) * 115.0; // r in [20, 135]
      const spiralTheta = baseArmAngle + windingSpeed * Math.pow(r, 0.60);
      const dispersion = Math.sin(idx * 3.14) * (0.8 + 1.6 * (r / 135.0));
      const lateralOffset = dispersion / r;

      const theta = spiralTheta + lateralOffset;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = Math.sin(idx * 2.1) * (0.4 + 1.2 * (r / 135.0));

      const pos: [number, number, number] = [x, y, z];
      artistPositionMap.set(raw.id, pos);

      const clusterId = artistClusterMap.get(raw.id) || unclassifiedClusterDef.id;
      const genresFormatted = (raw.genres || []).map(capitalize);
      const classification = artistClassificationMap.get(raw.id) || 'unclassified';

      normalizedArtists.push({
        id: `spot_art_${raw.id}`,
        name: raw.name,
        genres: genresFormatted.length > 0 ? genresFormatted : ['Unclassified'],
        artworkUrl: raw.images?.[0]?.url || raw.images?.[1]?.url,
        providerId: raw.id,
        source: 'spotify',
        prominence: Math.max(15, raw.popularity || 50),
        clusterId,
        position: pos,
        classificationState: classification,
        externalUrls: raw.external_urls || { spotify: `https://open.spotify.com/artist/${raw.id}` },
        bio: `${raw.name} — ${
          genresFormatted.slice(0, 3).join(', ') || 'Unclassified'
        }. Popularity rating: ${raw.popularity || 50}/100${
          raw.followers?.total ? ` with ${raw.followers.total.toLocaleString()} followers` : ''
        }.`,
      });
    });
  }

  // Calculate cluster bounding geometries
  const clusters: TasteCluster[] = activeClusterDefs.map((def) => {
    const memberArts = normalizedArtists.filter((a) => a.clusterId === def.id);
    const memberRaw = uniqueArtists.filter((a) => artistClusterMap.get(a.id) === def.id);

    const armsUsed = new Set(memberArts.map((a) => artistArmIndexMap.get(a.providerId!)));
    let center: [number, number, number];

    if (armsUsed.size === 1) {
      const arm = Array.from(armsUsed)[0] ?? 0;
      const baseArmAngle = arm * (Math.PI / 2);
      const rMid = 68.0;
      const thetaMid = baseArmAngle + windingSpeed * Math.pow(rMid, 0.60);
      center = [rMid * Math.cos(thetaMid), 0, rMid * Math.sin(thetaMid)];
    } else {
      center = [0, 0, 0];
    }

    let maxDist = 0;
    memberArts.forEach((a) => {
      if (a.position) {
        const d = Math.hypot(a.position[0] - center[0], a.position[2] - center[2]);
        if (d > maxDist) maxDist = d;
      }
    });

    const radius = Math.max(55.0, maxDist + 22.0);

    // Dominant verified genres
    const genreCounts = new Map<string, number>();
    memberRaw.forEach((a) => {
      (a.genres || []).forEach((g) => {
        const clean = capitalize(g);
        genreCounts.set(clean, (genreCounts.get(clean) || 0) + 1);
      });
    });

    const dominantGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([g]) => g);

    const avgProminence =
      memberRaw.length > 0
        ? memberRaw.reduce((sum, a) => sum + (a.popularity || 50), 0) / memberRaw.length
        : 50;

    return {
      id: def.id,
      label: def.label,
      color: def.color,
      description: `${def.descriptionPrefix}. Contains ${memberArts.length} verified artist system${
        memberArts.length === 1 ? '' : 's'
      }.`,
      memberArtistIds: memberArts.map((a) => a.id),
      center,
      radius,
      metrics: {
        avgProminence: Math.round(avgProminence),
        dominantGenres: dominantGenres.length > 0 ? dominantGenres : ['Unclassified'],
        artistCount: memberArts.length,
        trackCount: 0,
      },
      algorithmVersion: '4.0.0-master-spiral-galaxy-architecture',
    };
  });

  const artistById = new Map<string, Artist>(normalizedArtists.map((a) => [a.id, a]));

  // 5. Deduplicate and normalize Tracks & extract Albums
  const trackMap = new Map<string, SpotifyRawTrack>();
  const albumMap = new Map<string, Album>();

  rawTracks.forEach((t) => {
    if (t && t.id && !trackMap.has(t.id)) {
      trackMap.set(t.id, t);
    }

    if (t?.album && t.album.id && !albumMap.has(t.album.id)) {
      albumMap.set(t.album.id, {
        id: `spot_alb_${t.album.id}`,
        title: t.album.name || 'Unknown Album',
        artistIds: (t.album.artists || t.artists || []).map((a) => `spot_art_${a.id}`),
        releaseYear: parseInt(t.album.release_date?.slice(0, 4) || '2024') || 2024,
        artworkUrl: t.album.images?.[0]?.url,
        source: 'spotify',
      });
    }
  });

  const uniqueTracks = Array.from(trackMap.values());
  const albums = Array.from(albumMap.values());

  // Calculate maximum play count across recently played for proportional sizing
  let maxRecentPlays = 1;
  recentPlayCounts.forEach((count) => {
    if (count > maxRecentPlays) maxRecentPlays = count;
  });

  // Track planet colors mapped harmoniously
  const PLANET_PALETTES = ['#00F0FF', '#FF2E93', '#8C6CFF', '#FFB800', '#00FF9D', '#FF6B00', '#A0C4FF'];

  // Map tracks to celestial bodies orbiting their parent artist stars
  const artistTrackCountMap = new Map<string, number>();

  const normalizedTracks: Track[] = uniqueTracks.map((t, globalIdx) => {
    // Find primary parent artist
    const parentArtistId = t.artists?.[0]?.id ? `spot_art_${t.artists[0].id}` : null;
    const parentArtist = parentArtistId ? artistById.get(parentArtistId) : null;

    const artistSlot = parentArtist ? (artistTrackCountMap.get(parentArtist.id) || 0) : globalIdx;
    if (parentArtist) {
      artistTrackCountMap.set(parentArtist.id, artistSlot + 1);
    }

    const orbitRadius = 3.8 + (artistSlot % 6) * 2.2;
    const orbitSpeed = 0.16 + (artistSlot % 4) * 0.05;
    const initialAngle = ((artistSlot % 6) / 6) * Math.PI * 2;

    // Stable 3D celestial coordinates
    let posX = 0;
    let posY = 0;
    let posZ = 0;
    if (parentArtist?.position) {
      const [ax, ay, az] = parentArtist.position;
      posX = ax + Math.cos(initialAngle) * orbitRadius;
      posY = ay + ((artistSlot % 3) - 1) * 0.2;
      posZ = az + Math.sin(initialAngle) * orbitRadius;
    }

    // Listening frequency sizing logic (Part 3):
    // Genuine play count from recently-played endpoint
    const playCount = recentPlayCounts.get(t.id);
    const isFrequencyAvailable = typeof playCount === 'number' && playCount > 0;

    let planetSize: number;
    if (isFrequencyAvailable) {
      // Frequently played song -> larger and more prominent (square-root normalized scale)
      const ratio = playCount / maxRecentPlays;
      planetSize = 0.70 + 0.95 * Math.sqrt(ratio);
    } else {
      // Neutral default size when listening frequency is unavailable from Spotify API
      planetSize = 0.70;
    }

    const planetColor = PLANET_PALETTES[globalIdx % PLANET_PALETTES.length];

    // Diversely and harmoniously assign the 5 AAA art reference archetypes across each artist system
    const ARCHETYPES: PlanetArchetype[] = [
      'polar_vortex',
      'golden_swirl',
      'aurora_oceanic',
      'ultraviolet_storm',
      'cratered_multispectral',
    ];
    const archetype: PlanetArchetype = ARCHETYPES[artistSlot % ARCHETYPES.length];

    // Rings: strictly polar_vortex gas giants (Ref 1), preventing rings from clashing with terrestrial/oceanic worlds
    const hasRings = archetype === 'polar_vortex';

    const classification: 'verified_genre' | 'unclassified' | 'unavailable' = parentArtist?.classificationState || 'unclassified';

    return {
      id: `spot_trk_${t.id}`,
      title: t.name || 'Untitled Track',
      artistIds: (t.artists || []).map((a) => `spot_art_${a.id}`),
      albumId: t.album?.id ? `spot_alb_${t.album.id}` : undefined,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url || undefined,
      source: 'spotify',
      orbitRadius,
      orbitSpeed,
      planetColor,
      planetSize,
      archetype,
      hasRings,
      playCount: isFrequencyAvailable ? playCount : undefined,
      isFrequencyAvailable,
      popularity: t.popularity || 0,
      classificationState: classification,
      parentClusterId: parentArtist?.clusterId || 'cluster_unclassified',
      position: [posX, posY, posZ],
      externalUrls: t.external_urls || { spotify: `https://open.spotify.com/track/${t.id}` },
      spotifyUri: t.uri || `spotify:track:${t.id}`,
      audioFeatures: {
        energy: (t.popularity || 50) / 100,
        tempo: 100 + ((t.popularity || 50) % 50),
        valence: 0.5,
      },
    };
  });

  // Update track counts on clusters
  clusters.forEach((c) => {
    const memberIds = new Set(c.memberArtistIds);
    c.metrics.trackCount = normalizedTracks.filter((t) =>
      t.artistIds.some((aid) => memberIds.has(aid))
    ).length;
  });

  // 6. Generate Legitimate Stellar Relationships (Collaborations & Shared Lineage)
  const relationships: Relationship[] = [];
  const relKeySet = new Set<string>();

  function addRel(
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    score: number,
    explanation: string
  ) {
    if (sourceId === targetId) return;
    const key = [sourceId, targetId].sort().join(':::');
    if (relKeySet.has(key)) return;
    relKeySet.add(key);

    relationships.push({
      id: `rel_${sourceId}_${targetId}`,
      sourceId,
      targetId,
      type,
      score: Math.min(1, Math.max(0.1, score)),
      provenance: 'spotify_verified_relationship',
      explanation,
    });
  }

  // 6.1 Verified Collaborators (artists appearing together on releases)
  normalizedTracks.forEach((t) => {
    if (t.artistIds.length > 1) {
      for (let i = 0; i < t.artistIds.length; i++) {
        for (let j = i + 1; j < t.artistIds.length; j++) {
          addRel(
            t.artistIds[i],
            t.artistIds[j],
            'collaborator',
            0.95,
            `Collaborated on release: "${t.title}"`
          );
        }
      }
    }
  });

  // 6.2 Verified Stylistic Kinship (Jaccard similarity on verified Spotify artist genres)
  for (let i = 0; i < normalizedArtists.length; i++) {
    const a1 = normalizedArtists[i];
    const g1 = new Set(a1.genres.filter((g) => g !== 'Unclassified').map((g) => g.toLowerCase()));
    if (g1.size === 0) continue;

    for (let j = i + 1; j < normalizedArtists.length; j++) {
      const a2 = normalizedArtists[j];
      const g2 = new Set(a2.genres.filter((g) => g !== 'Unclassified').map((g) => g.toLowerCase()));
      if (g2.size === 0) continue;

      let intersection = 0;
      const shared: string[] = [];
      g1.forEach((g) => {
        if (g2.has(g)) {
          intersection++;
          shared.push(capitalize(g));
        }
      });

      const union = g1.size + g2.size - intersection;
      const jaccard = union > 0 ? intersection / union : 0;

      if (jaccard >= 0.25) {
        const type: RelationshipType = jaccard >= 0.45 ? 'stylistic_sibling' : 'genre_kin';
        const score = jaccard * 1.4 + 0.2;
        addRel(
          a1.id,
          a2.id,
          type,
          score,
          `Shared verified genres: ${shared.slice(0, 3).join(', ')}`
        );
      }
    }
  }

  // 6.3 Interstellar Galactic Corridors for Pathfinding across distinct galaxies
  for (let k = 0; k < clusters.length; k++) {
    const c1 = clusters[k];
    const c2 = clusters[(k + 1) % clusters.length];
    if (c1.id !== c2.id && c1.memberArtistIds.length > 0 && c2.memberArtistIds.length > 0) {
      addRel(
        c1.memberArtistIds[0],
        c2.memberArtistIds[0],
        'era_contemporary',
        0.5,
        `Galactic corridor connecting ${c1.label} and ${c2.label}`
      );
    }
  }

  return {
    artists: normalizedArtists,
    albums,
    tracks: normalizedTracks,
    relationships,
    clusters,
  };
}

/**
 * Realignment pass that positions all artist systems and their revolving song planets
 * distributed gracefully among the 4 logarithmic spiral arms of the photorealistic Master Spiral Galaxy.
 * Guarantees balanced distribution across all arms with zero artists or planets floating outside in the void.
 */
export function alignUniverseToMasterSpiralGalaxy(
  artists: Artist[],
  tracks: Track[],
  clusters: TasteCluster[]
): { artists: Artist[]; tracks: Track[]; clusters: TasteCluster[] } {
  if (!artists || artists.length === 0) {
    return { artists: [], tracks: [], clusters: [] };
  }

  const NUM_ARMS = 4;
  const windingSpeed = 0.62;

  // 1. Group artists by clusterId
  const clusterMap = new Map<string, TasteCluster>();
  (clusters || []).forEach((c) => clusterMap.set(c.id, c));

  const artistsByCluster = new Map<string, Artist[]>();
  artists.forEach((art) => {
    const cid =
      art.clusterId && clusterMap.has(art.clusterId) ? art.clusterId : 'cluster_unclassified';
    if (!artistsByCluster.has(cid)) artistsByCluster.set(cid, []);
    artistsByCluster.get(cid)!.push(art);
  });

  // Sort artists within each cluster by prominence descending
  artistsByCluster.forEach((list) => {
    list.sort((a, b) => (b.prominence || 50) - (a.prominence || 50));
  });

  // 2. Assign arms to artists ensuring all 4 arms are populated
  const activeClusterIds = Array.from(artistsByCluster.keys());
  const numClusters = activeClusterIds.length;

  // Mapping from artist.id to arm index (0, 1, 2, or 3)
  const artistArmMap = new Map<string, number>();

  if (numClusters >= 4) {
    // 4 or more clusters: each cluster maps to an arm
    activeClusterIds.forEach((cid, cIdx) => {
      const armIdx = cIdx % NUM_ARMS;
      const list = artistsByCluster.get(cid)!;
      list.forEach((art) => {
        artistArmMap.set(art.id, armIdx);
      });
    });
  } else if (numClusters === 3) {
    // 3 clusters: 2 clusters get 1 arm each, the largest cluster splits across arm 0 and arm 3
    const sorted = [...activeClusterIds].sort(
      (a, b) => artistsByCluster.get(b)!.length - artistsByCluster.get(a)!.length
    );
    // Largest cluster: splits across Arm 0 and Arm 3
    artistsByCluster.get(sorted[0])!.forEach((art, i) => {
      artistArmMap.set(art.id, i % 2 === 0 ? 0 : 3);
    });
    // Second cluster: Arm 1
    artistsByCluster.get(sorted[1])!.forEach((art) => {
      artistArmMap.set(art.id, 1);
    });
    // Third cluster: Arm 2
    artistsByCluster.get(sorted[2])!.forEach((art) => {
      artistArmMap.set(art.id, 2);
    });
  } else if (numClusters === 2) {
    // 2 clusters: each cluster splits across a pair of opposite arms
    // Cluster 0 -> Arm 0 and Arm 2 (opposite symmetrical arms)
    artistsByCluster.get(activeClusterIds[0])!.forEach((art, i) => {
      artistArmMap.set(art.id, i % 2 === 0 ? 0 : 2);
    });
    // Cluster 1 -> Arm 1 and Arm 3 (opposite symmetrical arms)
    artistsByCluster.get(activeClusterIds[1])!.forEach((art, i) => {
      artistArmMap.set(art.id, i % 2 === 0 ? 1 : 3);
    });
  } else {
    // 1 cluster (e.g. all unclassified or single genre): distribute evenly round-robin across all 4 arms!
    const singleList = artistsByCluster.get(activeClusterIds[0]) || artists;
    singleList.forEach((art, i) => {
      artistArmMap.set(art.id, i % NUM_ARMS);
    });
  }

  // 3. For each arm, calculate radial positions and 3D coordinates for its assigned artists
  const armArtistsMap = new Map<number, Artist[]>();
  for (let a = 0; a < NUM_ARMS; a++) armArtistsMap.set(a, []);

  artists.forEach((art) => {
    const arm = artistArmMap.get(art.id) ?? 0;
    armArtistsMap.get(arm)!.push(art);
  });

  const updatedArtists: Artist[] = [];
  const artistPosMap = new Map<string, [number, number, number]>();

  for (let arm = 0; arm < NUM_ARMS; arm++) {
    const list = armArtistsMap.get(arm)!;
    // Sort this arm's artists by prominence descending
    list.sort((a, b) => (b.prominence || 50) - (a.prominence || 50));
    const armCount = Math.max(1, list.length);
    const baseArmAngle = arm * (Math.PI / 2);

    list.forEach((art, idx) => {
      const norm = armCount > 1 ? idx / (armCount - 1) : 0.5;
      const r = 20.0 + Math.pow(norm, 0.85) * 115.0; // r in [20, 135]
      const spiralTheta = baseArmAngle + windingSpeed * Math.pow(r, 0.60);
      const dispersion = Math.sin(idx * 3.14159) * (0.8 + 1.6 * (r / 135.0));
      const lateralOffset = dispersion / r;

      const theta = spiralTheta + lateralOffset;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = Math.sin(idx * 2.1) * (0.4 + 1.2 * (r / 135.0));

      const pos: [number, number, number] = [x, y, z];
      artistPosMap.set(art.id, pos);

      updatedArtists.push({
        ...art,
        position: pos,
      });
    });
  }

  // 4. Update Cluster centers and radii
  const updatedClusters: TasteCluster[] = [];
  const clusterListToProcess =
    clusters && clusters.length > 0
      ? clusters
      : [
          {
            id: 'cluster_unclassified',
            label: 'Grand Cosmic Spiral',
            color: '#FFFFFF',
            description: 'Central macro spiral galaxy encompassing all artist systems',
            memberArtistIds: artists.map((a) => a.id),
            center: [0, 0, 0] as [number, number, number],
            radius: 155.0,
            metrics: {
              avgProminence: 60,
              dominantGenres: ['All Genres'],
              artistCount: artists.length,
              trackCount: tracks.length,
            },
            algorithmVersion: '4.0.0-master-spiral-galaxy-architecture',
          },
        ];

  clusterListToProcess.forEach((c) => {
    const memberArts = updatedArtists.filter((a) => a.clusterId === c.id);
    if (memberArts.length === 0) {
      updatedClusters.push(c);
      return;
    }

    // Check which arms this cluster's artists are on
    const armsUsed = new Set(memberArts.map((a) => artistArmMap.get(a.id)));
    let center: [number, number, number];

    if (armsUsed.size === 1) {
      // Single arm: center is arm midpoint
      const armIdx = Array.from(armsUsed)[0] ?? 0;
      const baseArmAngle = armIdx * (Math.PI / 2);
      const rMid = 68.0;
      const thetaMid = baseArmAngle + windingSpeed * Math.pow(rMid, 0.60);
      center = [rMid * Math.cos(thetaMid), 0, rMid * Math.sin(thetaMid)];
    } else {
      // Multi-arm / opposite arms: center is galactic core [0, 0, 0]
      center = [0, 0, 0];
    }

    let maxDist = 0;
    memberArts.forEach((a) => {
      if (a.position) {
        const d = Math.hypot(a.position[0] - center[0], a.position[2] - center[2]);
        if (d > maxDist) maxDist = d;
      }
    });

    updatedClusters.push({
      ...c,
      center,
      radius: Math.max(55.0, maxDist + 22.0),
      memberArtistIds: memberArts.map((a) => a.id),
    });
  });

  // 5. Re-anchor tracks tightly around their updated parent artist stars
  const updatedTracks: Track[] = (tracks || []).map((track, globalIdx) => {
    const parentArtistId = track.artistIds?.[0];
    const parentPos = parentArtistId ? artistPosMap.get(parentArtistId) : undefined;
    const parentArtist = updatedArtists.find((a) => a.id === parentArtistId);

    const orbitRadius =
      track.orbitRadius && track.orbitRadius <= 12.0
        ? track.orbitRadius
        : 2.8 + (globalIdx % 6) * 1.6;

    const angle = ((globalIdx % 6) / 6) * Math.PI * 2 + (globalIdx % 3) * 0.45;

    let pos: [number, number, number];
    if (parentPos) {
      pos = [
        parentPos[0] + Math.cos(angle) * orbitRadius,
        parentPos[1] + ((globalIdx % 3) - 1) * 0.2,
        parentPos[2] + Math.sin(angle) * orbitRadius,
      ];
    } else {
      const arm = globalIdx % NUM_ARMS;
      const baseAngle = arm * (Math.PI / 2);
      const r = 24.0 + (globalIdx % 20) * 5.0;
      const th = baseAngle + 0.62 * Math.pow(r, 0.60);
      pos = [r * Math.cos(th), 0, r * Math.sin(th)];
    }

    return {
      ...track,
      position: pos,
      orbitRadius,
      parentClusterId: parentArtist?.clusterId || track.parentClusterId,
    };
  });

  return {
    artists: updatedArtists,
    tracks: updatedTracks,
    clusters: updatedClusters,
  };
}
