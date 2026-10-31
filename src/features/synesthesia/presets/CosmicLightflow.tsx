'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getStarParticleTexture, getEnergySparkTexture } from '../../universe/shaders/particleTextures';

interface CosmicLightflowProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

/**
 * PRESET 3 — COSMIC LIGHTFLOW (Reference D)
 * Multilayer luminous streams, flowing strands of light, particle ribbons, and speed streaks.
 * Forms a relativistic hyperjump / warp conduit with varying thickness, velocity, and opacity.
 * Palette: Pure white, sol gold, warm amber, electric cyan, and neon magenta accents.
 */
export function CosmicLightflow({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: CosmicLightflowProps) {
  const streamPointsRef = useRef<THREE.Points>(null);
  const fastStreaksRef = useRef<THREE.Points>(null);
  const conduitRibbonRef = useRef<THREE.Mesh>(null);

  const starTexture = useMemo(() => getStarParticleTexture(), []);
  const sparkTexture = useMemo(() => getEnergySparkTexture(), []);

  const streamCount = Math.floor(3600 * particleDensity);
  const streakCount = Math.floor(800 * particleDensity);

  // 1. Layered Luminous Vertical Stream Lines (Hourglass / Hyperjump Conduit)
  const { positions, origPositions, colors, speeds, radii, strandAngles } = useMemo(() => {
    const pos = new Float32Array(streamCount * 3);
    const orig = new Float32Array(streamCount * 3);
    const col = new Float32Array(streamCount * 3);
    const sp = new Float32Array(streamCount);
    const rads = new Float32Array(streamCount);
    const angs = new Float32Array(streamCount);

    const cWhite = new THREE.Color('#FFFFFF');
    const cGold = new THREE.Color('#FFDF73');
    const cAmber = new THREE.Color('#FF9233');
    const cCyan = new THREE.Color('#64DFFF');
    const cMagenta = new THREE.Color('#FF2E93');

    const totalStrands = 18;

    for (let i = 0; i < streamCount; i++) {
      const i3 = i * 3;
      const strandIndex = i % totalStrands;
      const strandBaseAngle = (strandIndex / totalStrands) * Math.PI * 2;

      // Vertical span from -32 to +32
      const yNorm = (i / streamCount); // 0 to 1
      const y = (yNorm - 0.5) * 64.0;

      // Hourglass waist profile: radius is narrow in middle (waist), flaring outward at top and bottom
      const waistFactor = Math.pow(Math.abs(yNorm - 0.5) * 2.0, 1.8);
      const baseR = 5.0 + waistFactor * 16.0;
      const strandJitter = (Math.random() - 0.5) * 2.2;
      const r = Math.max(1.5, baseR + strandJitter);

      // Spiral twist along length
      const theta = strandBaseAngle + y * 0.045 + (Math.random() - 0.5) * 0.15;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      orig[i3] = x;
      orig[i3 + 1] = y;
      orig[i3 + 2] = z;

      rads[i] = r;
      angs[i] = theta;
      sp[i] = 12.0 + Math.random() * 24.0;

      // Palette Distribution matching Reference D
      const strandPhase = strandIndex / totalStrands;
      let c: THREE.Color;
      if (strandPhase < 0.35) {
        c = cWhite.clone().lerp(cGold, Math.random() * 0.6);
      } else if (strandPhase < 0.65) {
        c = cGold.clone().lerp(cAmber, Math.random() * 0.8);
      } else if (strandPhase < 0.85) {
        c = cCyan.clone().lerp(cWhite, Math.random() * 0.5);
      } else {
        c = cMagenta.clone().lerp(cAmber, Math.random() * 0.4);
      }

      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;
    }

    return {
      positions: pos,
      origPositions: orig,
      colors: col,
      speeds: sp,
      radii: rads,
      strandAngles: angs,
    };
  }, [streamCount]);

  // 2. High-Speed Relativistic Streaks (Spark Conduits)
  const { streakPos, streakColors, streakSpeeds } = useMemo(() => {
    const pos = new Float32Array(streakCount * 3);
    const col = new Float32Array(streakCount * 3);
    const speeds = new Float32Array(streakCount);

    const cWhite = new THREE.Color('#FFFFFF');
    const cCyan = new THREE.Color('#7DF9FF');
    const cGold = new THREE.Color('#FFE28A');

    for (let i = 0; i < streakCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 64.0;
      const waistFactor = Math.pow(Math.abs(y / 32.0), 1.8);
      const r = (4.0 + waistFactor * 14.0) * (0.8 + Math.random() * 0.4);

      pos[i3] = Math.cos(angle) * r;
      pos[i3 + 1] = y;
      pos[i3 + 2] = Math.sin(angle) * r;

      speeds[i] = 28.0 + Math.random() * 45.0;

      const c = Math.random() < 0.5 ? cWhite : Math.random() < 0.5 ? cCyan : cGold;
      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;
    }

    return { streakPos: pos, streakColors: col, streakSpeeds: speeds };
  }, [streakCount]);

  useFrame((_, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const baseSpeed = 1.0 + metrics.bass * 2.2 + metrics.transient * 3.5;

    // 1. Move Luminous Stream Particles along the vertical conduit
    if (streamPointsRef.current) {
      const posAttr = streamPointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = streamCount;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        let y = posAttr.getY(i) + speeds[i] * delta * baseSpeed * 0.4;
        if (y > 32.0) y -= 64.0;

        const yNorm = (y + 32.0) / 64.0;
        const waistFactor = Math.pow(Math.abs(yNorm - 0.5) * 2.0, 1.8);
        const r = (5.0 + waistFactor * 16.0) * (1.0 + metrics.subBass * 0.15);
        const theta = strandAngles[i] + y * 0.045;

        posAttr.setXYZ(i, Math.cos(theta) * r, y, Math.sin(theta) * r);
      }
      posAttr.needsUpdate = true;
    }

    // 2. Animate High-Speed Relativistic Streaks
    if (fastStreaksRef.current) {
      const posAttr = fastStreaksRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = streakCount;

      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) + streakSpeeds[i] * delta * baseSpeed * 0.6;
        if (y > 32.0) y -= 64.0;

        const angle = Math.atan2(posAttr.getZ(i), posAttr.getX(i));
        const waistFactor = Math.pow(Math.abs(y / 32.0), 1.8);
        const r = 4.0 + waistFactor * 14.0;

        posAttr.setXYZ(i, Math.cos(angle) * r, y, Math.sin(angle) * r);
      }
      posAttr.needsUpdate = true;
    }

    // 3. Conduit Ribbon Rotation
    if (conduitRibbonRef.current && !reducedMotion) {
      conduitRibbonRef.current.rotation.y += delta * (0.25 + metrics.mid * 0.6);
    }
  });

  return (
    <group name="cosmic-lightflow-preset">
      {/* 1. Primary Luminous Stream Particles (Reference D) */}
      <points ref={streamPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTexture}
          size={1.65}
          vertexColors
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* 2. Relativistic Velocity Speed Streaks */}
      <points ref={fastStreaksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[streakPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[streakColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sparkTexture}
          size={2.4}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* 3. Central Luminous Conduit Flare Tube */}
      <mesh ref={conduitRibbonRef}>
        <cylinderGeometry args={[2.5, 2.5, 60, 32, 1, true]} />
        <meshBasicMaterial
          color="#FFF8E0"
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

