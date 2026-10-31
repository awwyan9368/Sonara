import * as THREE from 'three';

/**
 * Universal High-Performance Procedural Particle Sprites
 * Creates Gaussian soft-falloff luminous circle textures for WebGL Points.
 * Eliminates square rasterization artifacts and produces cinematic, soft celestial glow.
 */

let cachedStarTexture: THREE.Texture | null = null;
let cachedGlowTexture: THREE.Texture | null = null;
let cachedNebulaTexture: THREE.Texture | null = null;

/**
 * Clean star particle with soft Gaussian core and exponential falloff.
 */
export function getStarParticleTexture(): THREE.Texture {
  if (cachedStarTexture) return cachedStarTexture;

  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    cachedStarTexture = new THREE.Texture();
    return cachedStarTexture;
  }

  const center = 32;
  const radius = 30;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);

  // Intense hot white core fading smoothly through airy glow to 0 alpha
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.12, 'rgba(240, 245, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(200, 225, 255, 0.45)');
  grad.addColorStop(0.65, 'rgba(150, 180, 255, 0.12)');
  grad.addColorStop(1.0, 'rgba(100, 150, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  cachedStarTexture = new THREE.CanvasTexture(canvas);
  cachedStarTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedStarTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedStarTexture.needsUpdate = true;

  return cachedStarTexture;
}

/**
 * Larger diffuse glow puff for nebulae and volumetric cosmic dust.
 */
export function getNebulaDustTexture(): THREE.Texture {
  if (cachedNebulaTexture) return cachedNebulaTexture;

  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    cachedNebulaTexture = new THREE.Texture();
    return cachedNebulaTexture;
  }

  const center = 64;
  const radius = 62;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);

  // Ethereal diffuse puff
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.2, 'rgba(230, 220, 255, 0.4)');
  grad.addColorStop(0.5, 'rgba(180, 160, 255, 0.15)');
  grad.addColorStop(0.8, 'rgba(120, 100, 220, 0.04)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  cachedNebulaTexture = new THREE.CanvasTexture(canvas);
  cachedNebulaTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedNebulaTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedNebulaTexture.needsUpdate = true;

  return cachedNebulaTexture;
}

/**
 * Vivid energy spark with high-energy pinhead center and halo.
 */
export function getEnergySparkTexture(): THREE.Texture {
  if (cachedGlowTexture) return cachedGlowTexture;

  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    cachedGlowTexture = new THREE.Texture();
    return cachedGlowTexture;
  }

  const center = 32;
  const radius = 30;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);

  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.1, 'rgba(220, 255, 255, 0.85)');
  grad.addColorStop(0.3, 'rgba(120, 220, 255, 0.35)');
  grad.addColorStop(0.7, 'rgba(80, 150, 255, 0.08)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  cachedGlowTexture = new THREE.CanvasTexture(canvas);
  cachedGlowTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedGlowTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedGlowTexture.needsUpdate = true;

  return cachedGlowTexture;
}

let cachedSpikeTexture: THREE.Texture | null = null;

/**
 * Astrophotography 4-point cross diffraction spike for bright galactic cores and stellar pinpoints.
 */
export function getCrossSpikeTexture(): THREE.Texture {
  if (cachedSpikeTexture) return cachedSpikeTexture;

  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    cachedSpikeTexture = new THREE.Texture();
    return cachedSpikeTexture;
  }

  const c = 64;
  ctx.clearRect(0, 0, 128, 128);

  // Horizontal diffraction spike
  const gradH = ctx.createLinearGradient(0, c, 128, c);
  gradH.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradH.addColorStop(0.35, 'rgba(230, 240, 255, 0.25)');
  gradH.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  gradH.addColorStop(0.65, 'rgba(230, 240, 255, 0.25)');
  gradH.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradH;
  ctx.fillRect(0, c - 2, 128, 4);

  // Vertical diffraction spike
  const gradV = ctx.createLinearGradient(c, 0, c, 128);
  gradV.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradV.addColorStop(0.35, 'rgba(230, 240, 255, 0.25)');
  gradV.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  gradV.addColorStop(0.65, 'rgba(230, 240, 255, 0.25)');
  gradV.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradV;
  ctx.fillRect(c - 2, 0, 4, 128);

  // Central intense hot core
  const radGrad = ctx.createRadialGradient(c, c, 0, c, c, 26);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  radGrad.addColorStop(0.2, 'rgba(240, 248, 255, 0.7)');
  radGrad.addColorStop(0.6, 'rgba(200, 230, 255, 0.15)');
  radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 128, 128);

  cachedSpikeTexture = new THREE.CanvasTexture(canvas);
  cachedSpikeTexture.wrapS = THREE.ClampToEdgeWrapping;
  cachedSpikeTexture.wrapT = THREE.ClampToEdgeWrapping;
  cachedSpikeTexture.needsUpdate = true;

  return cachedSpikeTexture;
}

