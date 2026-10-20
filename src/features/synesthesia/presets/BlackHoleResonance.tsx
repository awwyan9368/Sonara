'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

interface BlackHoleResonanceProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

export function BlackHoleResonance({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: BlackHoleResonanceProps) {
  const diskRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const jetTopRef = useRef<THREE.Mesh>(null);
  const jetBottomRef = useRef<THREE.Mesh>(null);
  const sparksRef = useRef<THREE.Points>(null);

  const particleCount = Math.floor(1600 * particleDensity);

  // Relativistic Accretion Texture
  const accretionTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 512, 0);

    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.1, 'rgba(100, 223, 255, 0.98)'); // Intense blue-shifted inner rim
    grad.addColorStop(0.3, 'rgba(140, 108, 255, 0.85)'); // Violet mid
    grad.addColorStop(0.6, 'rgba(232, 188, 131, 0.7)');  // Amber
    grad.addColorStop(0.85, 'rgba(255, 60, 20, 0.45)');  // Red-shifted outer edge
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // Relativistic particles spiraling into event horizon
  const { positions, initialAngles, radii, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const angles = new Float32Array(particleCount);
    const rad = new Float32Array(particleCount);
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const r = 5.2 + Math.pow(Math.random(), 1.6) * 16.0;
      const theta = Math.random() * Math.PI * 2;
      angles[i] = theta;
      rad[i] = r;

      pos[i3] = Math.cos(theta) * r;
      pos[i3 + 1] = (Math.random() - 0.5) * 1.5;
      pos[i3 + 2] = Math.sin(theta) * r;

      // Color based on distance to horizon (Doppler shift)
      const t = (r - 5.2) / 16.0;
      if (t < 0.25) {
        col[i3] = 0.4; col[i3 + 1] = 0.85; col[i3 + 2] = 1.0; // Cyan/white hot
      } else if (t < 0.6) {
        col[i3] = 0.6; col[i3 + 1] = 0.45; col[i3 + 2] = 1.0; // Violet
      } else {
        col[i3] = 0.95; col[i3 + 1] = 0.6; col[i3 + 2] = 0.3; // Orange/Amber
      }
    }

    return { positions: pos, initialAngles: angles, radii: rad, colors: col };
  }, [particleCount]);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);

    // 1. Accretion Disk Rotation & Pulsing
    if (diskRef.current) {
      if (!reducedMotion) {
        diskRef.current.rotation.z += delta * (0.6 + metrics.mid * 0.8);
      }
      const s = 1.0 + metrics.subBass * 0.4 + metrics.bass * 0.3;
      diskRef.current.scale.set(s, s, s);
    }

    // 2. Event Horizon Schwarzschild Pulsing
    if (coreRef.current) {
      const s = 1.0 + metrics.subBass * 0.15;
      coreRef.current.scale.set(s, s, s);
    }

    // 3. Relativistic Magnetic Jets
    if (jetTopRef.current && jetBottomRef.current) {
      const jetScaleY = 1.0 + metrics.bass * 1.5 + metrics.transient * 1.8;
      jetTopRef.current.scale.set(1.0, jetScaleY, 1.0);
      jetBottomRef.current.scale.set(1.0, jetScaleY, 1.0);
      const jetAlpha = 0.3 + metrics.highMid * 0.6;
      (jetTopRef.current.material as THREE.MeshBasicMaterial).opacity = jetAlpha;
      (jetBottomRef.current.material as THREE.MeshBasicMaterial).opacity = jetAlpha;
    }

    // 4. Inflowing Infall Particles
    if (sparksRef.current && !reducedMotion) {
      const geo = sparksRef.current.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Keplerian orbital speed: faster closer to horizon
        const r = radii[i];
        const angSpeed = (35.0 / Math.pow(r, 1.5)) * (1.0 + metrics.mid * 1.2);
        initialAngles[i] += delta * angSpeed;

        posAttr.array[i3] = Math.cos(initialAngles[i]) * r;
        posAttr.array[i3 + 2] = Math.sin(initialAngles[i]) * r;
      }

      posAttr.needsUpdate = true;
    }
  });

  return (
    <group name="black-hole-resonance-master" rotation={[Math.PI / 3.4, 0.2, 0]}>
      {/* Pitch-Black Schwarzschild Event Horizon */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[4.8, 36, 36]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Relativistic Photosphere Lensing Ring */}
      <mesh>
        <ringGeometry args={[4.85, 5.2, 80]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Main Accretion Disk */}
      <mesh ref={diskRef}>
        <ringGeometry args={[5.2, 18.5, 96]} />
        <meshBasicMaterial
          map={accretionTexture}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Top Polar Plasma Jet */}
      <mesh ref={jetTopRef} position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 1.2, 20, 16]} />
        <meshBasicMaterial
          color="#64DFFF"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Bottom Polar Plasma Jet */}
      <mesh ref={jetBottomRef} position={[0, 0, -10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.2, 0.3, 20, 16]} />
        <meshBasicMaterial
          color="#64DFFF"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Infalling Relativistic Particle Accretion Disk */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.8}
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

