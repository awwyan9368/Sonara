import { describe, it, expect } from 'vitest';
import { AudioEngine } from '@/features/synesthesia/audio/audioEngine';
import {
  getProceduralPlanetTexture,
  getProceduralRingTexture,
} from '@/features/universe/shaders/planetTextures';
import {
  getStarParticleTexture,
  getNebulaDustTexture,
  getCrossSpikeTexture,
} from '@/features/universe/shaders/particleTextures';

describe('Advanced Graphics & Audio Pipeline', () => {
  it('audio engine calculates 7 frequency bands and transient metrics cleanly', () => {
    const engine = AudioEngine.getInstance();
    const metrics = engine.getEnergyMetrics(1.0);

    expect(metrics).toHaveProperty('subBass');
    expect(metrics).toHaveProperty('bass');
    expect(metrics).toHaveProperty('lowMid');
    expect(metrics).toHaveProperty('mid');
    expect(metrics).toHaveProperty('highMid');
    expect(metrics).toHaveProperty('treble');
    expect(metrics).toHaveProperty('presence');
    expect(metrics).toHaveProperty('transient');
    expect(metrics).toHaveProperty('rms');
    expect(metrics).toHaveProperty('peak');

    // Values should be normalized between 0 and 1
    expect(metrics.subBass).toBeGreaterThanOrEqual(0);
    expect(metrics.subBass).toBeLessThanOrEqual(1);
    expect(metrics.overallEnergy).toBeGreaterThanOrEqual(0);
    expect(metrics.overallEnergy).toBeLessThanOrEqual(1);
  });

  it('generates cached procedural planet textures across archetypes', () => {
    const tex1 = getProceduralPlanetTexture('gas_giant', 101, 128);
    const tex2 = getProceduralPlanetTexture('lava_world', 202, 128);
    const tex3 = getProceduralPlanetTexture('ice_world', 303, 128);
    const tex4 = getProceduralPlanetTexture('terrestrial', 404, 128);
    const ringTex = getProceduralRingTexture('#E8BC83', 128);

    expect(tex1).toBeDefined();
    expect(tex2).toBeDefined();
    expect(tex3).toBeDefined();
    expect(tex4).toBeDefined();
    expect(ringTex).toBeDefined();

    // Cache lookup should return same instance
    const tex1Cached = getProceduralPlanetTexture('gas_giant', 101, 128);
    expect(tex1Cached).toBe(tex1);
  });

  it('generates and caches celestial particle and cross diffraction spike textures', () => {
    const starTex = getStarParticleTexture();
    const nebulaTex = getNebulaDustTexture();
    const spikeTex = getCrossSpikeTexture();

    expect(starTex).toBeDefined();
    expect(nebulaTex).toBeDefined();
    expect(spikeTex).toBeDefined();

    // Cache verification
    expect(getCrossSpikeTexture()).toBe(spikeTex);
    expect(getStarParticleTexture()).toBe(starTex);
    expect(getNebulaDustTexture()).toBe(nebulaTex);
  });
});

