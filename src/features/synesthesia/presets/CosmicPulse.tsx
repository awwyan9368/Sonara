'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

interface CosmicPulseProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

export function CosmicPulse({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: CosmicPulseProps) {
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const ring4Ref = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const ribbonLineRef = useRef<THREE.LineSegments>(null);

  const particleCount = Math.floor(1800 * particleDensity);

  // Sparks & dust cloud
  const { sparkPositions, sparkColors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const r = 8 + Math.pow(Math.random(), 1.5) * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Cyan to Violet to Amber palette
      const t = Math.random();
      if (t < 0.45) {
        col[i * 3] = 0.39; col[i * 3 + 1] = 0.87; col[i * 3 + 2] = 1.0; // Cyan
      } else if (t < 0.8) {
        col[i * 3] = 0.55; col[i * 3 + 1] = 0.42; col[i * 3 + 2] = 1.0; // Violet
      } else {
        col[i * 3] = 0.91; col[i * 3 + 1] = 0.74; col[i * 3 + 2] = 0.51; // Amber
      }
    }

    return { sparkPositions: pos, sparkColors: col };
  }, [particleCount]);

  // Nested Lissajous Ribbon Curve
  const ribbonGeo = useMemo(() => {
    const segments = 240;
    const pos = new Float32Array(segments * 6);
    for (let i = 0; i < segments; i++) {
      const t1 = (i / segments) * Math.PI * 2;
      const t2 = ((i + 1) / segments) * Math.PI * 2;

      // 3D Lissajous knot
      const x1 = Math.sin(t1 * 3) * 14;
      const y1 = Math.cos(t1 * 2) * 9;
      const z1 = Math.sin(t1 * 4) * 14;

      const x2 = Math.sin(t2 * 3) * 14;
      const y2 = Math.cos(t2 * 2) * 9;
      const z2 = Math.sin(t2 * 4) * 14;

      pos[i * 6] = x1; pos[i * 6 + 1] = y1; pos[i * 6 + 2] = z1;
      pos[i * 6 + 3] = x2; pos[i * 6 + 4] = y2; pos[i * 6 + 5] = z2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Central Core: Reacts to Sub-bass and Bass energy
    if (coreMeshRef.current) {
      const targetScale = 1.0 + metrics.subBass * 1.8 + metrics.bass * 1.2;
      coreMeshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 18);
      if (!reducedMotion) {
        coreMeshRef.current.rotation.y += delta * (0.3 + metrics.mid * 1.8);
        coreMeshRef.current.rotation.z += delta * (0.2 + metrics.highMid * 1.2);
      }
    }

    // 2. Wavefront Expanding Concentric Rings
    const updateRing = (mesh: THREE.Mesh | null, offset: number, freq: number, colorShift: number) => {
      if (!mesh) return;
      const s = 1.0 + ((time * 0.8 + offset + freq * 0.6) % 3.0);
      mesh.scale.set(s, s, s);
      const alpha = Math.max(0, 1.0 - (s - 1.0) / 3.0);
      (mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.75;
      if (!reducedMotion) {
        mesh.rotation.z += delta * (0.2 + colorShift);
      }
    };

    updateRing(ring1Ref.current, 0.0, metrics.bass, 0.2);
    updateRing(ring2Ref.current, 0.75, metrics.lowMid, -0.3);
    updateRing(ring3Ref.current, 1.5, metrics.mid, 0.4);
    updateRing(ring4Ref.current, 2.25, metrics.highMid, -0.2);

    // 3. Transient Shockwave Burst
    if (shockwaveRef.current) {
      if (metrics.transient > 0.3) {
        const shockScale = 1.0 + metrics.transient * 4.5;
        shockwaveRef.current.scale.set(shockScale, shockScale, shockScale);
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = metrics.transient * 0.9;
      } else {
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity *= 0.85;
      }
    }

    // 4. Sparkle Particles: React to Treble & Presence
    if (sparksRef.current && !reducedMotion) {
      sparksRef.current.rotation.y += delta * (0.08 + metrics.treble * 0.6);
      sparksRef.current.rotation.x += delta * (0.05 + metrics.presence * 0.4);
    }

    // 5. Lissajous Ribbon Lines: Morph with Midrange
    if (ribbonLineRef.current && !reducedMotion) {
      ribbonLineRef.current.rotation.y -= delta * (0.2 + metrics.mid * 0.5);
      ribbonLineRef.current.rotation.x += delta * (0.15 + metrics.lowMid * 0.4);
      const ribbonScale = 1.0 + metrics.mid * 0.4;
      ribbonLineRef.current.scale.set(ribbonScale, ribbonScale, ribbonScale);
    }
  });

  return (
    <group name="cosmic-pulse-master">
      {/* Central Photosphere Energy Core */}
      <mesh ref={coreMeshRef}>
        <icosahedronGeometry args={[3.4, 4]} />
        <meshStandardMaterial
          color="#64DFFF"
          emissive="#8C6CFF"
          emissiveIntensity={2.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Inner Hot Singularity Glow */}
      <mesh>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Transient Shockwave Ring */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 4.4, 64]} />
        <meshBasicMaterial
          color="#64DFFF"
          transparent
          opacity={0.0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Wavefront Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.5, 5.8, 64]} />
        <meshBasicMaterial color="#64DFFF" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 2.3, 0.25, 0]}>
        <ringGeometry args={[8.5, 8.8, 64]} />
        <meshBasicMaterial color="#8C6CFF" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh ref={ring3Ref} rotation={[Math.PI / 1.7, -0.3, 0.1]}>
        <ringGeometry args={[12.0, 12.3, 64]} />
        <meshBasicMaterial color="#E8BC83" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh ref={ring4Ref} rotation={[Math.PI / 2.8, -0.15, -0.2]}>
        <ringGeometry args={[16.0, 16.3, 64]} />
        <meshBasicMaterial color="#64DFFF" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* 3D Lissajous Energy Filament Ribbons */}
      <lineSegments ref={ribbonLineRef} geometry={ribbonGeo}>
        <lineBasicMaterial
          color="#A882FF"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* High-Frequency Stellar Spark Cloud */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[sparkColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.6}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
