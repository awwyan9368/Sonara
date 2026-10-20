import * as THREE from 'three';

export type PlanetArchetype =
  | 'terrestrial'
  | 'gas_giant'
  | 'ice_world'
  | 'lava_world'
  | 'barren_moon';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Procedural Planet Texture Generator
 * Uses 2D canvas with multi-octave noise approximations to generate realistic maps
 */
export function getProceduralPlanetTexture(
  archetype: PlanetArchetype,
  seed = 42,
  resolution = 512
): THREE.CanvasTexture {
  const cacheKey = `${archetype}_${seed}_${resolution}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
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

  const pseudoRandom = (x: number, y: number) => {
    const val = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return val - Math.floor(val);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    // Cubic interpolation
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

  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    const v = (y / canvas.height) * 8.0;
    for (let x = 0; x < canvas.width; x++) {
      const u = (x / canvas.width) * 16.0;
      const idx = (y * canvas.width + x) * 4;

      if (archetype === 'gas_giant') {
        // Zonal wind bands modulated by turbulence
        const bandNoise = fractalNoise(u * 0.5, v * 3.5, 4);
        const bandVal = Math.sin(v * 4.0 + bandNoise * 3.0) * 0.5 + 0.5;
        // Palettes: Amber/cream or Cyan/deep indigo
        const isCyanGiant = (seed % 2 === 0);
        if (isCyanGiant) {
          data[idx] = Math.floor(20 + bandVal * 90);
          data[idx + 1] = Math.floor(120 + bandVal * 120);
          data[idx + 2] = Math.floor(190 + bandVal * 65);
        } else {
          data[idx] = Math.floor(180 + bandVal * 75);
          data[idx + 1] = Math.floor(110 + bandVal * 70);
          data[idx + 2] = Math.floor(60 + bandVal * 40);
        }
      } else if (archetype === 'lava_world') {
        // Dark volcanic basalt with glowing magma fissures
        const n = fractalNoise(u * 1.5, v * 1.5, 5);
        const fissure = Math.abs(n - 0.5);
        if (fissure < 0.08) {
          // Molten magma vein
          const heat = 1.0 - fissure / 0.08;
          data[idx] = 255;
          data[idx + 1] = Math.floor(80 + heat * 140);
          data[idx + 2] = Math.floor(heat * 30);
        } else {
          // Dark basalt crust
          const crust = Math.floor(25 + n * 35);
          data[idx] = crust + 15;
          data[idx + 1] = crust;
          data[idx + 2] = crust;
        }
      } else if (archetype === 'ice_world') {
        // Fractured glacial ice sheets with deep cyan crevasse highlights
        const n = fractalNoise(u * 2.0, v * 2.0, 5);
        const crack = Math.abs(fractalNoise(u * 4.0, v * 4.0, 3) - 0.5);
        const iceBlue = Math.floor(180 + n * 75);
        data[idx] = crack < 0.04 ? 70 : Math.floor(140 + n * 80);
        data[idx + 1] = crack < 0.04 ? 180 : Math.floor(200 + n * 55);
        data[idx + 2] = crack < 0.04 ? 255 : iceBlue;
      } else if (archetype === 'barren_moon') {
        // Craters and rugged regolith
        const n = fractalNoise(u * 3.0, v * 3.0, 5);
        const craterN = smoothNoise(u * 1.8, v * 1.8);
        const isCraterRim = Math.abs(craterN - 0.45) < 0.05;
        const base = Math.floor(70 + n * 90 + (isCraterRim ? 40 : 0));
        data[idx] = base;
        data[idx + 1] = base;
        data[idx + 2] = base + 5;
      } else {
        // Terrestrial (continents, blue oceans, green/brown biome)
        const elevation = fractalNoise(u * 1.2, v * 1.2, 5);
        if (elevation < 0.48) {
          // Deep to shallow ocean
          const depth = elevation / 0.48;
          data[idx] = Math.floor(15 + depth * 25);
          data[idx + 1] = Math.floor(40 + depth * 65);
          data[idx + 2] = Math.floor(110 + depth * 110);
        } else {
          // Continental landmass
          const landHeight = (elevation - 0.48) / 0.52;
          data[idx] = Math.floor(45 + landHeight * 90);
          data[idx + 1] = Math.floor(75 + (1 - landHeight) * 45);
          data[idx + 2] = Math.floor(35 + landHeight * 25);
        }
      }

      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Procedural Ring Texture Generator (Alpha & Cassini Divisions)
 */
export function getProceduralRingTexture(baseColor = '#E8BC83', resolution = 256): THREE.CanvasTexture {
  const cacheKey = `ring_${baseColor}_${resolution}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    textureCache.set(cacheKey, fallbackTex);
    return fallbackTex;
  }

  const imgData = ctx.createImageData(resolution, 1);
  const data = imgData.data;
  const col = new THREE.Color(baseColor);

  for (let x = 0; x < resolution; x++) {
    const t = x / resolution;
    const idx = x * 4;

    // Cassini division gap at t ~ 0.65 to 0.72
    let alpha = Math.sin(t * Math.PI);
    if (t > 0.62 && t < 0.7) {
      alpha *= 0.08;
    } else {
      // Sub-divisions
      alpha *= 0.6 + Math.sin(t * 80.0) * 0.25;
    }

    data[idx] = Math.floor(col.r * 255);
    data[idx + 1] = Math.floor(col.g * 255);
    data[idx + 2] = Math.floor(col.b * 255);
    data[idx + 3] = Math.floor(Math.max(0, Math.min(255, alpha * 240)));
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}
