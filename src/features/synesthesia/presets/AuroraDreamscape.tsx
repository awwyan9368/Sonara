'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

interface AuroraDreamscapeProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

export function AuroraDreamscape({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: AuroraDreamscapeProps) {
  const mesh1Ref = useRef<THREE.Mesh>(null);
  const mesh2Ref = useRef<THREE.Mesh>(null);
  const mesh3Ref = useRef<THREE.Mesh>(null);
  const ionSparksRef = useRef<THREE.Points>(null);

  const particleCount = Math.floor(1200 * particleDensity);

  // Aurora Ribbon Geometry (Plane with fine horizontal segments for undulating waves)
  const createCurtainGeometry = (width = 50, height = 24, segX = 64, segY = 16) => {
    return new THREE.PlaneGeometry(width, height, segX, segY);
  };

  const curtain1Geo = useMemo(() => createCurtainGeometry(54, 22, 64, 16), []);
  const curtain2Geo = useMemo(() => createCurtainGeometry(60, 26, 64, 16), []);
  const curtain3Geo = useMemo(() => createCurtainGeometry(48, 18, 64, 16), []);

  // Ionization Sparkles
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 55;
      const y = (Math.random() - 0.5) * 22;
      const z = (Math.random() - 0.5) * 25;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Emerald to Cyan to Magenta
      const t = Math.random();
      if (t < 0.45) {
        col[i * 3] = 0.2; col[i * 3 + 1] = 0.95; col[i * 3 + 2] = 0.65; // Emerald
      } else if (t < 0.8) {
        col[i * 3] = 0.25; col[i * 3 + 1] = 0.85; col[i * 3 + 2] = 1.0; // Cyan
      } else {
        col[i * 3] = 0.88; col[i * 3 + 1] = 0.4; col[i * 3 + 2] = 0.95; // Magenta
      }
    }

    return { positions: pos, colors: col };
  }, [particleCount]);

  useFrame((state) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    const deformCurtain = (mesh: THREE.Mesh | null, speed: number, waveAmp: number, freq: number) => {
      if (!mesh || reducedMotion) return;
      const geo = mesh.geometry as THREE.PlaneGeometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);

        // Sinusoidal undulating wave along X axis
        const wave =
          Math.sin(x * 0.12 + time * speed) * (waveAmp + metrics.bass * 3.5) +
          Math.cos(x * 0.08 + time * speed * 0.7) * (waveAmp * 0.6 + metrics.lowMid * 2.0);

        posAttr.setZ(i, wave);
      }
      posAttr.needsUpdate = true;
    };

    deformCurtain(mesh1Ref.current, 1.2, 3.0, metrics.bass);
    deformCurtain(mesh2Ref.current, 0.9, 4.0, metrics.lowMid);
    deformCurtain(mesh3Ref.current, 1.5, 2.5, metrics.mid);

    if (ionSparksRef.current && !reducedMotion) {
      ionSparksRef.current.rotation.y = Math.sin(time * 0.15) * 0.1;
    }
  });

  return (
    <group name="aurora-dreamscape-master">
      {/* 1. Primary Emerald / Turquoise Aurora Curtain */}
      <mesh ref={mesh1Ref} position={[0, 2, -4]} geometry={curtain1Geo}>
        <meshBasicMaterial
          color="#2BFFA3"
          wireframe
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Secondary Deep Cyan / Blue Aurora Curtain */}
      <mesh ref={mesh2Ref} position={[0, 4, -8]} geometry={curtain2Geo}>
        <meshBasicMaterial
          color="#38D7FF"
          wireframe
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Violet / Magenta High-Altitude Ion Curtain */}
      <mesh ref={mesh3Ref} position={[0, 6, -12]} geometry={curtain3Geo}>
        <meshBasicMaterial
          color="#E27BFF"
          wireframe
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Suspended Ionization Sparks */}
      <points ref={ionSparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
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

