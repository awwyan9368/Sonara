import * as THREE from 'three';
import { Track, PlanetArchetype } from '@/types';

export type { PlanetArchetype };

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Universal Smooth Step
 */
function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

/**
 * Robust, deterministic Archetype Resolver
 * Guarantees that planets match their intended celestial archetype (both for test fixtures and live Spotify tracks).
 */
export function resolveTrackArchetype(track: Track): PlanetArchetype {
  // 1. Explicit archetype if set on track
  if (track.archetype) {
    return track.archetype;
  }

  const idLower = (track.id || '').toLowerCase();
  const titleLower = (track.title || '').toLowerCase();

  // 2. Keyword detection in ID or title
  if (idLower.includes('polar_vortex') || titleLower.includes('polar vortex') || titleLower.includes('cyclone')) {
    return 'polar_vortex';
  }
  if (idLower.includes('golden') || titleLower.includes('golden') || titleLower.includes('marble') || idLower.includes('swirl') || titleLower.includes('amber')) {
    return 'golden_swirl';
  }
  if (idLower.includes('aurora') || titleLower.includes('aurora') || idLower.includes('ocean') || titleLower.includes('oceanic')) {
    return 'aurora_oceanic';
  }
  if (idLower.includes('ultraviolet') || idLower.includes('uv_jovian') || titleLower.includes('jovian') || titleLower.includes('storm')) {
    return 'ultraviolet_storm';
  }
  if (idLower.includes('crater') || idLower.includes('basalt') || titleLower.includes('crater') || titleLower.includes('basalt') || titleLower.includes('multispectral')) {
    return 'cratered_multispectral';
  }

  // 3. Audio feature & genre heuristic for real Spotify tracks
  const energy = track.audioFeatures?.energy;
  const acoustic = track.audioFeatures?.acousticness;
  if (typeof energy === 'number' && energy > 0.78) return 'ultraviolet_storm';
  if (typeof acoustic === 'number' && acoustic > 0.65) return 'cratered_multispectral';

  // 4. Deterministic balanced distribution across the 5 reference archetypes
  const archetypes: PlanetArchetype[] = [
    'polar_vortex',           // Ref 1: Pastel Mint & Lavender Polar Cyclone Gas Giant
    'golden_swirl',           // Ref 2: Golden Amber & Caramel Fluid Marble World
    'aurora_oceanic',         // Ref 3: Turquoise Oceans with Magenta Aurora Clouds
    'ultraviolet_storm',      // Ref 4: Cobalt & Violet Jovian Great Storm
    'cratered_multispectral', // Ref 5: Electric Cobalt & Bronze Impact Ray World
  ];

  let hash = 0;
  for (let i = 0; i < track.id.length; i++) {
    hash = (hash << 5) - hash + track.id.charCodeAt(i);
    hash |= 0;
  }
  return archetypes[Math.abs(hash) % archetypes.length];
}

/**
 * Ultra-High-Fidelity Procedural Planet Texture Generator
 * Directly models the 5 AAA art reference archetypes:
 * 1. Polar Vortex Gas Giant (Ref 1): Pastel mint, lavender, cream bands with concentric polar cyclone & Cassini rings.
 * 2. Golden Marble Swirl (Ref 2): Amber, honey, caramel, and espresso fluid marble whorls with curl vorticity.
 * 3. Aurora Oceanic World (Ref 3): Deep azure/turquoise oceans with swirling magenta/rose aurora storm clouds.
 * 4. Ultraviolet Jovian Storm (Ref 4): Deep cobalt, violet, and indigo banded flows with cyclonic oval storm spots.
 * 5. Multi-Spectral Cratered World (Ref 5): Electric cobalt and metallic bronze crust with radiant impact crater rays.
 */
export function getProceduralPlanetTexture(
  archetype: PlanetArchetype,
  seed = 42,
  resolution = 512
): THREE.CanvasTexture {
  // Normalize seed to 2 deterministic visual variations per archetype (caps cache at 10 textures total)
  const seedVariation = Math.abs(seed) % 2;
  const effectiveSeed = seedVariation * 1337 + 42;
  const cacheKey = `planet_${archetype}_${seedVariation}_${resolution}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.Texture() as unknown as THREE.CanvasTexture;
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution / 2; // Equirectangular 2:1 projection
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  // PRNG with deterministic seed
  const pseudoRandom = (x: number, y: number) => {
    const val = Math.sin(x * 12.9898 + y * 78.233 + effectiveSeed) * 43758.5453;
    return val - Math.floor(val);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = pseudoRandom(i, j);
    const n10 = pseudoRandom(i + 1, j);
    const n01 = pseudoRandom(i, j + 1);
    const n11 = pseudoRandom(i + 1, j + 1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    return nx0 * (1 - sy) + nx1 * sy;
  };

  const fractalNoise = (u: number, v: number, octaves = 5) => {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let o = 0; o < octaves; o++) {
      val += smoothNoise(u * freq, v * freq) * amp;
      freq *= 2.0;
      amp *= 0.5;
    }
    return val;
  };

  // High-order Inigo Quilez domain warping for viscous fluid marble swirls
  const warpNoise = (u: number, v: number): number => {
    const qx = fractalNoise(u, v, 4);
    const qy = fractalNoise(u + 5.2, v + 1.3, 4);
    const rx = fractalNoise(u + 4.0 * qx + 1.7, v + 4.0 * qy + 9.2, 4);
    const ry = fractalNoise(u + 4.0 * qx + 8.3, v + 4.0 * qy + 2.8, 4);
    return fractalNoise(u + 4.2 * rx, v + 4.2 * ry, 5);
  };

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  // Resolve archetype aliases
  const targetArchetype: PlanetArchetype =
    archetype === 'gas_giant'
      ? (seed % 2 === 0 ? 'polar_vortex' : 'ultraviolet_storm')
      : archetype === 'terrestrial'
      ? (seed % 2 === 0 ? 'golden_swirl' : 'aurora_oceanic')
      : archetype === 'barren_moon'
      ? 'cratered_multispectral'
      : archetype;

  for (let y = 0; y < canvas.height; y++) {
    const normY = y / canvas.height; // 0 at north pole, 1 at south pole
    const phi = (0.5 - normY) * Math.PI; // Latitude: +pi/2 (north) to -pi/2 (south)
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < canvas.width; x++) {
      const normX = x / canvas.width;
      const theta = normX * Math.PI * 2.0; // Longitude: 0 to 2pi

      // 3D Cartesian coordinates on unit sphere
      const sx = cosPhi * Math.cos(theta);
      const sy = sinPhi;
      const sz = cosPhi * Math.sin(theta);

      const u = normX * 12.0;
      const v = normY * 6.0;
      const idx = (y * canvas.width + x) * 4;

      let r = 0;
      let g = 0;
      let b = 0;

      if (targetArchetype === 'polar_vortex') {
        // --- 1. POLAR VORTEX GAS GIANT (Reference 1) ---
        // Pastel mint, seafoam, lavender, and cream bands with a prominent swirling polar cyclone
        const poleRadius = Math.sqrt(sx * sx + sz * sz);
        const isNorthPolarRegion = sy > 0.36;

        if (isNorthPolarRegion) {
          // Concentric swirling hurricane at the pole
          const angle = Math.atan2(sz, sx);
          const spiralAngle = angle + 6.2 * Math.pow(Math.max(0.01, poleRadius), 0.68);
          const spiralNoise = smoothNoise(Math.cos(spiralAngle) * 4.2 + 15, Math.sin(spiralAngle) * 4.2 + 15);
          const ring = Math.sin(poleRadius * 42.0 + spiralNoise * 3.6) * 0.5 + 0.5;

          const eye = smoothstep(0.0, 0.22, poleRadius);
          const t = Math.min(1.0, poleRadius / 0.85);

          // Center eye: deep spruce teal (#0E3B34) -> Mint (#5ECEAA) -> Seafoam (#8EE8CB) -> Lavender (#D5CEE8)
          if (eye < 0.28) {
            const k = eye / 0.28;
            r = Math.floor(14 + k * 45);
            g = Math.floor(59 + k * 85);
            b = Math.floor(52 + k * 72);
          } else {
            const k = (eye - 0.28) / 0.72;
            r = Math.floor(59 + k * 80 + ring * 40 + (1 - t) * 18);
            g = Math.floor(144 + k * 70 + ring * 32);
            b = Math.floor(124 + k * 85 + ring * 42 + t * 45);
          }
        } else {
          // Zonal pastel belts with wave shear turbulence
          const shear = fractalNoise(sx * 2.2 + 2.0, sy * 8.5, 4) * 0.28;
          const bandCoord = sy * 7.5 + shear;
          const band = Math.sin(bandCoord * 3.14159) * 0.5 + 0.5;
          const fineStriation = Math.sin(sy * 48.0) * 0.08;
          const fineNoise = fractalNoise(sx * 4.5, sy * 14.0, 3) * 0.14;

          // Alternating pastel lilac (#D5CCE6), warm cream (#FAF7EE), seafoam (#8FE5C8), and slate teal (#326074)
          const mixFactor = Math.max(0, Math.min(1, (band + fineNoise + fineStriation + 1.0) * 0.5));
          if (mixFactor < 0.32) {
            // Slate teal to seafoam
            const k = mixFactor / 0.32;
            r = Math.floor(48 + k * 72);
            g = Math.floor(92 + k * 120);
            b = Math.floor(116 + k * 78);
          } else if (mixFactor < 0.68) {
            // Seafoam to warm cream
            const k = (mixFactor - 0.32) / 0.36;
            r = Math.floor(120 + k * 130);
            g = Math.floor(212 + k * 35);
            b = Math.floor(194 + k * 44);
          } else {
            // Warm cream to pastel lavender
            const k = (mixFactor - 0.68) / 0.32;
            r = Math.floor(250 - k * 36);
            g = Math.floor(247 - k * 42);
            b = Math.floor(238 - k * 8);
          }
        }
      } else if (targetArchetype === 'golden_swirl') {
        // --- 2. GOLDEN MARBLE SWIRL (Reference 2) ---
        // Amber, honey, caramel, and cream fluid marble whorls with multi-scale curl vorticity
        const marble = warpNoise(sx * 2.1 + 10, sy * 2.1 + 10);
        const w1 = fractalNoise(sx * 4.2 + marble * 2.5, sy * 4.2 + marble * 2.5, 4);
        const fineCurl = smoothNoise(sx * 8.5 + w1 * 4.2, sy * 8.5 + w1 * 4.2) * 0.24;
        const val = Math.max(0, Math.min(1, Math.sin(marble * 6.28 + w1 * 2.8) * 0.5 + 0.5 + fineCurl));

        // Palette: Roasted Espresso (#2E180A) -> Burnt Caramel (#7C3B0E) -> Amber Gold (#CD841E) -> Honey (#EDB038) -> Cream (#FFF8EC)
        if (val < 0.28) {
          const k = val / 0.28;
          r = Math.floor(46 + k * 78);
          g = Math.floor(24 + k * 35);
          b = Math.floor(10 + k * 4);
        } else if (val < 0.65) {
          const k = (val - 0.28) / 0.37;
          r = Math.floor(124 + k * 81);
          g = Math.floor(59 + k * 75);
          b = Math.floor(14 + k * 42);
        } else {
          const k = (val - 0.65) / 0.35;
          r = Math.floor(205 + k * 50);
          g = Math.floor(134 + k * 114);
          b = Math.floor(56 + k * 180);
        }
      } else if (targetArchetype === 'aurora_oceanic') {
        // --- 3. AURORA OCEANIC WORLD (Reference 3) ---
        // Brilliant cyan/turquoise ocean with swirling magenta/rose/peach aurora storm clouds & bioluminescent knots
        const oceanNoise = fractalNoise(sx * 2.6 + 5, sy * 2.6 + 5, 5);
        const auroraWarp = warpNoise(sx * 1.8 + 15, sy * 1.8 + 15);
        const auroraDensity = Math.sin(auroraWarp * 7.5 + sx * 2.8) * 0.5 + 0.5;
        const fineFilaments = fractalNoise(sx * 6.5, sy * 6.5, 3) * 0.22;
        const totalAurora = Math.max(0, Math.min(1, auroraDensity + fineFilaments));

        // Base ocean colors: Deep abyss (#0A2E4E) to tropical reef turquoise (#24A8C8) to electric cyan (#3AE4FF)
        let oR = 0, oG = 0, oB = 0;
        if (oceanNoise < 0.45) {
          const k = oceanNoise / 0.45;
          oR = Math.floor(10 + k * 15);
          oG = Math.floor(46 + k * 65);
          oB = Math.floor(78 + k * 75);
        } else {
          const k = (oceanNoise - 0.45) / 0.55;
          oR = Math.floor(25 + k * 33);
          oG = Math.floor(111 + k * 117);
          oB = Math.floor(153 + k * 102);
        }

        // Aurora colors: Luminous magenta (#E62478), hot rose pink (#FF4E94), crimson peach (#FF7C98), hot ivory core (#FFF2F6)
        const auroraAlpha = smoothstep(0.42, 0.72, totalAurora);
        if (auroraAlpha > 0.01) {
          const aIntensity = (totalAurora - 0.42) / 0.58;
          const hotCenter = aIntensity > 0.70 ? (aIntensity - 0.70) / 0.30 : 0;
          const aR = Math.floor(215 + aIntensity * 40);
          const aG = Math.floor(36 + aIntensity * 110 + hotCenter * 95);
          const aB = Math.floor(118 + aIntensity * 85 + hotCenter * 45);

          r = Math.floor(oR * (1 - auroraAlpha) + aR * auroraAlpha);
          g = Math.floor(oG * (1 - auroraAlpha) + aG * auroraAlpha);
          b = Math.floor(oB * (1 - auroraAlpha) + aB * auroraAlpha);
        } else {
          r = oR;
          g = oG;
          b = oB;
        }
      } else if (targetArchetype === 'ultraviolet_storm') {
        // --- 4. ULTRAVIOLET JOVIAN STORM (Reference 4) ---
        // Deep cobalt, violet, and royal purple banded flows with cyclonic Great Storm ovals
        const bandShear = fractalNoise(sx * 2.5 + 8, sy * 11.5 + 8, 4) * 0.38;
        const bandVal = Math.sin(sy * 9.5 + bandShear * 4.0) * 0.5 + 0.5;

        // Primary Great Storm Oval (southern temperate belt: sy ~ -0.32, sx ~ 0.22)
        const dStorm1 = Math.hypot((sx - 0.22) * 1.5, (sy + 0.32) * 3.4);
        let storm1Color = 0;
        if (dStorm1 < 0.38) {
          const sAngle = Math.atan2(sy + 0.32, sx - 0.22) + 5.0 * Math.pow(dStorm1 / 0.38, 0.7);
          const spiral = Math.sin(sAngle * 3.0 + dStorm1 * 22.0) * 0.5 + 0.5;
          const stormIntensity = Math.cos((dStorm1 / 0.38) * (Math.PI / 2));
          storm1Color = stormIntensity * (0.75 + spiral * 0.25);
        }

        // Secondary storm oval at sy ~ 0.40, sx ~ -0.42
        const dStorm2 = Math.hypot((sx + 0.42) * 1.7, (sy - 0.40) * 3.4);
        let storm2Color = 0;
        if (dStorm2 < 0.26) {
          const storm2Intensity = Math.cos((dStorm2 / 0.26) * (Math.PI / 2));
          storm2Color = storm2Intensity * 0.85;
        }

        // Palette: Midnight Indigo (#0D0B2E) -> Royal Cobalt (#182672) -> Electric Violet (#541E92) -> Lavender/White storm core
        r = Math.floor(18 + bandVal * 75 + storm1Color * 165 + storm2Color * 115);
        g = Math.floor(16 + bandVal * 44 + storm1Color * 168 + storm2Color * 122);
        b = Math.floor(84 + bandVal * 125 + storm1Color * 105 + storm2Color * 105);
      } else if (targetArchetype === 'cratered_multispectral') {
        // --- 5. MULTI-SPECTRAL CRATERED WORLD (Reference 5) ---
        // Electric cobalt blue basalt plains, metallic bronze highlands, and radiant impact crater ejecta ray systems
        const baseNoise = fractalNoise(sx * 3.2 + 4, sy * 3.2 + 4, 6);
        
        // Crater 1: Major fresh impact crater at (sx=0.18, sy=-0.12, sz=0.96)
        const c1x = 0.18, c1y = -0.12, c1z = 0.96;
        const c1Dist = Math.acos(Math.max(-1, Math.min(1, sx * c1x + sy * c1y + sz * c1z)));
        const angle1 = Math.atan2(sy - c1y, sx - c1x);
        const rays1 = Math.pow(Math.max(0, Math.cos(angle1 * 14.0)), 4.0) * Math.exp(-c1Dist * 2.2);
        const rays1b = Math.pow(Math.max(0, Math.cos(angle1 * 22.0 + 0.5)), 4.0) * 0.6 * Math.exp(-c1Dist * 2.8);
        const totalRays1 = rays1 + rays1b;

        // Crater 2: Impact crater at (sx=-0.45, sy=-0.36, sz=0.81)
        const c2x = -0.45, c2y = -0.36, c2z = 0.81;
        const c2Dist = Math.acos(Math.max(-1, Math.min(1, sx * c2x + sy * c2y + sz * c2z)));
        const angle2 = Math.atan2(sy - c2y, sx - c2x);
        const rays2 = Math.pow(Math.max(0, Math.cos(angle2 * 12.0)), 4.0) * Math.exp(-c2Dist * 2.4);

        // Crater 3: Impact crater at (sx=0.52, sy=0.40, sz=0.75)
        const c3x = 0.52, c3y = 0.40, c3z = 0.75;
        const c3Dist = Math.acos(Math.max(-1, Math.min(1, sx * c3x + sy * c3y + sz * c3z)));
        const angle3 = Math.atan2(sy - c3y, sx - c3x);
        const rays3 = Math.pow(Math.max(0, Math.cos(angle3 * 16.0)), 4.0) * Math.exp(-c3Dist * 2.5);

        const totalEjectaRays = totalRays1 + rays2 * 0.7 + rays3 * 0.6;

        // Cellular micro-craters across the whole planet
        const craterCell = Math.abs(smoothNoise(sx * 9.5 + 20, sy * 9.5 + 20) - 0.5);
        const isMicroRim = craterCell > 0.38 && craterCell < 0.44;

        if (c1Dist < 0.18) {
          // Inside central crater bowl & central uplift peak
          const peak = c1Dist < 0.05 ? 1.0 - c1Dist / 0.05 : 0;
          r = Math.floor(190 + peak * 65);
          g = Math.floor(170 + peak * 80);
          b = Math.floor(140 + peak * 115);
        } else if (c2Dist < 0.14) {
          const peak2 = c2Dist < 0.04 ? 1.0 - c2Dist / 0.04 : 0;
          r = Math.floor(180 + peak2 * 75);
          g = Math.floor(160 + peak2 * 90);
          b = Math.floor(130 + peak2 * 125);
        } else if (Math.abs(c1Dist - 0.18) < 0.038 || Math.abs(c2Dist - 0.14) < 0.032 || Math.abs(c3Dist - 0.16) < 0.035 || isMicroRim || totalEjectaRays > 0.20) {
          // Radiant white-gold/cyan impact ray ejecta blankets
          const rayBright = Math.min(1.0, totalEjectaRays * 1.3 + (isMicroRim ? 0.35 : 0.65));
          r = Math.floor(155 + rayBright * 100);
          g = Math.floor(145 + rayBright * 105);
          b = Math.floor(128 + rayBright * 127);
        } else {
          // Mineral dichotomy: electric cobalt blue basalt plains vs bronze highlands
          if (baseNoise < 0.46) {
            // Electric cobalt blue basalt maria
            const k = baseNoise / 0.46;
            r = Math.floor(14 + k * 28);
            g = Math.floor(48 + k * 62);
            b = Math.floor(142 + k * 108);
          } else {
            // Golden bronze / ochre highlands
            const k = (baseNoise - 0.46) / 0.54;
            r = Math.floor(135 + k * 85);
            g = Math.floor(88 + k * 65);
            b = Math.floor(38 + k * 32);
          }
        }
      } else if (targetArchetype === 'lava_world') {
        const n = fractalNoise(u * 1.6, v * 1.6, 5);
        const fissure = Math.abs(n - 0.5);
        if (fissure < 0.075) {
          const heat = 1.0 - fissure / 0.075;
          r = 255;
          g = Math.floor(70 + heat * 165);
          b = Math.floor(heat * 45);
        } else {
          const crust = Math.floor(22 + n * 40);
          r = crust + 18;
          g = crust;
          b = crust;
        }
      } else {
        const n = fractalNoise(u * 2.2, v * 2.2, 5);
        const ridge = Math.abs(fractalNoise(u * 4.5, v * 4.5, 3) - 0.5);
        if (ridge < 0.035) {
          r = 60;
          g = 205;
          b = 255;
        } else {
          const iceShade = Math.floor(175 + n * 70);
          r = iceShade - 20;
          g = iceShade + 8;
          b = iceShade + 28;
        }
      }

      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Procedural Dynamic Cloud Deck Texture
 * Simulates high-altitude vapor wisps for oceanic and marble worlds.
 */
export function getProceduralCloudTexture(seed = 42, resolution = 512): THREE.CanvasTexture {
  const cacheKey = `cloud_${seed}_${resolution}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.Texture() as unknown as THREE.CanvasTexture;
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution / 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const pseudoRandom = (x: number, y: number) => {
    const val = Math.sin(x * 12.9898 + y * 78.233 + seed + 999) * 43758.5453;
    return val - Math.floor(val);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = pseudoRandom(i, j);
    const n10 = pseudoRandom(i + 1, j);
    const n01 = pseudoRandom(i, j + 1);
    const n11 = pseudoRandom(i + 1, j + 1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    return nx0 * (1 - sy) + nx1 * sy;
  };

  const fractalNoise = (u: number, v: number) => {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let o = 0; o < 4; o++) {
      val += smoothNoise(u * freq, v * freq) * amp;
      freq *= 2.0;
      amp *= 0.5;
    }
    return val;
  };

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    const v = (y / canvas.height) * 4.0;
    for (let x = 0; x < canvas.width; x++) {
      const u = (x / canvas.width) * 8.0;
      const idx = (y * canvas.width + x) * 4;

      const n = fractalNoise(u + Math.sin(v * 2.0) * 0.4, v);
      const cloud = smoothstep(0.48, 0.78, n);

      data[idx] = 255;
      data[idx + 1] = 250;
      data[idx + 2] = 245;
      data[idx + 3] = Math.floor(cloud * 210);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Concentric Multi-Banded Cassini Planetary Ring Texture
 * Generates razor-sharp concentric Cassini divisions and micro-striations.
 */
export function getProceduralRingTexture(baseColor = '#3A2E44', resolution = 256): THREE.CanvasTexture {
  const cacheKey = `ring_${baseColor}_${resolution}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.Texture() as unknown as THREE.CanvasTexture;
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const center = resolution / 2;
  const maxR = resolution / 2;
  const innerR = maxR * 0.58;
  const outerR = maxR * 0.98;

  const imgData = ctx.createImageData(resolution, resolution);
  const data = imgData.data;
  const col = new THREE.Color(baseColor);

  for (let y = 0; y < resolution; y++) {
    const dy = y - center;
    for (let x = 0; x < resolution; x++) {
      const dx = x - center;
      const r = Math.hypot(dx, dy);
      const idx = (y * resolution + x) * 4;

      if (r < innerR || r > outerR) {
        data[idx + 3] = 0;
        continue;
      }

      const t = (r - innerR) / (outerR - innerR); // 0 (inner ring) to 1 (outer ring)

      // Cassini Division at t in [0.58, 0.68]
      let alpha = Math.sin(t * Math.PI);
      if (t > 0.58 && t < 0.68) {
        alpha *= 0.04; // Cassini gap
      } else if (t > 0.86 && t < 0.89) {
        alpha *= 0.08; // Encke gap
      } else {
        // Intricate micro-striations
        alpha *= 0.72 + Math.sin(t * 80.0) * 0.18 + Math.sin(t * 210.0) * 0.10;
      }

      data[idx] = Math.floor(col.r * 255);
      data[idx + 1] = Math.floor(col.g * 255);
      data[idx + 2] = Math.floor(col.b * 255);
      data[idx + 3] = Math.floor(Math.max(0, Math.min(255, alpha * 200)));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Procedural Planet Bump/Normal Map Generator
 * Produces crisp physical micro-relief for cratered worlds and fluid marble ridges.
 */
export function getProceduralPlanetBumpMap(
  archetype: PlanetArchetype,
  seed = 42,
  resolution = 256
): THREE.CanvasTexture | null {
  if (archetype !== 'cratered_multispectral' && archetype !== 'golden_swirl') {
    return null;
  }

  // Normalize seed to 2 deterministic visual variations (caps bump cache at 4 textures)
  const seedVariation = Math.abs(seed) % 2;
  const effectiveSeed = seedVariation * 1337 + 42;
  const cacheKey = `bump_${archetype}_${seedVariation}_${resolution}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  if (typeof document === 'undefined') {
    const fallbackTex = new THREE.Texture() as unknown as THREE.CanvasTexture;
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution / 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const pseudoRandom = (x: number, y: number) => {
    const val = Math.sin(x * 12.9898 + y * 78.233 + effectiveSeed) * 43758.5453;
    return val - Math.floor(val);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = pseudoRandom(i, j);
    const n10 = pseudoRandom(i + 1, j);
    const n01 = pseudoRandom(i, j + 1);
    const n11 = pseudoRandom(i + 1, j + 1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    return nx0 * (1 - sy) + nx1 * sy;
  };

  const fractalNoise = (u: number, v: number, octaves = 4) => {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let o = 0; o < octaves; o++) {
      val += smoothNoise(u * freq, v * freq) * amp;
      freq *= 2.0;
      amp *= 0.5;
    }
    return val;
  };

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    const normY = y / canvas.height;
    const phi = (0.5 - normY) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < canvas.width; x++) {
      const normX = x / canvas.width;
      const theta = normX * Math.PI * 2.0;

      const sx = cosPhi * Math.cos(theta);
      const sy = sinPhi;
      const sz = cosPhi * Math.sin(theta);
      const idx = (y * canvas.width + x) * 4;

      let h = 128;

      if (archetype === 'cratered_multispectral') {
        const baseH = fractalNoise(sx * 3.2 + 4, sy * 3.2 + 4, 5);
        
        // Crater 1: (0.18, -0.12, 0.96)
        const c1Dist = Math.acos(Math.max(-1, Math.min(1, sx * 0.18 + sy * -0.12 + sz * 0.96)));
        let crater1Elevation = 0;
        if (c1Dist < 0.18) {
          const floor = smoothstep(0.04, 0.16, c1Dist);
          const centralPeak = c1Dist < 0.05 ? (1.0 - c1Dist / 0.05) * 85 : 0;
          crater1Elevation = -65 * (1.0 - floor) + centralPeak;
        } else if (Math.abs(c1Dist - 0.18) < 0.038) {
          const rimDist = Math.abs(c1Dist - 0.18) / 0.038;
          crater1Elevation = (1.0 - rimDist) * 80;
        }

        // Crater 2: (-0.45, -0.36, 0.81)
        const c2Dist = Math.acos(Math.max(-1, Math.min(1, sx * -0.45 + sy * -0.36 + sz * 0.81)));
        let crater2Elevation = 0;
        if (c2Dist < 0.14) {
          const floor = smoothstep(0.03, 0.12, c2Dist);
          const centralPeak = c2Dist < 0.04 ? (1.0 - c2Dist / 0.04) * 75 : 0;
          crater2Elevation = -55 * (1.0 - floor) + centralPeak;
        } else if (Math.abs(c2Dist - 0.14) < 0.032) {
          const rimDist = Math.abs(c2Dist - 0.14) / 0.032;
          crater2Elevation = (1.0 - rimDist) * 70;
        }

        h = Math.floor(95 + baseH * 65 + crater1Elevation + crater2Elevation);
      } else if (archetype === 'golden_swirl') {
        const qx = fractalNoise(sx * 2.1 + 10, sy * 2.1 + 10, 3);
        const qy = fractalNoise(sx * 2.1 + 15, sy * 2.1 + 15, 3);
        const marble = fractalNoise(sx * 4.2 + qx * 2.5, sy * 4.2 + qy * 2.5, 4);
        h = Math.floor(80 + marble * 130);
      }

      const val = Math.max(0, Math.min(255, h));
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}
