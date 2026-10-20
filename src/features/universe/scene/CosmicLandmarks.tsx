'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CosmicLandmarksProps {
  reducedMotion?: boolean;
}

export function CosmicLandmarks({ reducedMotion = false }: CosmicLandmarksProps) {
  const blackHoleDiskRef = useRef<THREE.Mesh>(null);
  const blackHoleCoreRef = useRef<THREE.Mesh>(null);
  const cometGroupRef = useRef<THREE.Group>(null);
  const asteroidPointsRef = useRef<THREE.Points>(null);

  // Black hole positioned at deep cosmic coordinates [75, -25, -90]
  const blackHolePos: [number, number, number] = [75, -25, -90];

  // Procedural Accretion Disk Texture
  const accretionTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 512, 0);

    // Relativistic Doppler beaming gradient: brilliant blue/violet -> fiery amber/orange -> deep red -> fade
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.12, 'rgba(100, 223, 255, 0.95)'); // Cyan/blue hot inner edge
    grad.addColorStop(0.35, 'rgba(140, 108, 255, 0.85)'); // Violet mid
    grad.addColorStop(0.65, 'rgba(232, 188, 131, 0.65)'); // Warm amber
    grad.addColorStop(0.88, 'rgba(255, 80, 40, 0.35)');  // Red-orange outer
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // Asteroid belt positions (instanced points)
  const asteroids = useMemo(() => {
    const count = 450;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    let seed = 777;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      // Ring around [0, 0, 0] with radius 120-145
      const angle = rnd() * Math.PI * 2;
      const r = 115 + rnd() * 35;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (rnd() - 0.5) * 12;
      pos[i * 3 + 2] = Math.sin(angle) * r;

      const grey = 0.4 + rnd() * 0.35;
      col[i * 3] = grey;
      col[i * 3 + 1] = grey;
      col[i * 3 + 2] = grey + 0.05;

      sz[i] = 1.2 + rnd() * 2.5;
    }

    return { pos, col, sz };
  }, []);

  useFrame((state, delta) => {
    if (!reducedMotion) {
      const time = state.clock.getElapsedTime();

      // Accretion disk rotation
      if (blackHoleDiskRef.current) {
        blackHoleDiskRef.current.rotation.z += delta * 0.45;
      }

      // Comet orbital transit
      if (cometGroupRef.current) {
        const cometAngle = time * 0.08;
        const cx = Math.cos(cometAngle) * 95 - 15;
        const cz = Math.sin(cometAngle) * 75 + 10;
        const cy = Math.sin(time * 0.12) * 22;
        cometGroupRef.current.position.set(cx, cy, cz);
        // Align tail away from galactic center
        cometGroupRef.current.rotation.y = -cometAngle + Math.PI / 2;
      }

      // Asteroid belt slow drift
      if (asteroidPointsRef.current) {
        asteroidPointsRef.current.rotation.y += delta * 0.004;
      }
    }
  });

  return (
    <group name="special-celestial-landmarks">
      {/* 1. Supermassive Black Hole System */}
      <group position={blackHolePos}>
        {/* Pitch-Black Schwarzschild Event Horizon */}
        <mesh ref={blackHoleCoreRef}>
          <sphereGeometry args={[4.2, 32, 32]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Lensing Photosphere Ring */}
        <mesh rotation={[Math.PI / 3, 0.2, 0]}>
          <ringGeometry args={[4.25, 4.5, 64]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Rotating Relativistic Accretion Disk */}
        <mesh ref={blackHoleDiskRef} rotation={[Math.PI / 3, 0.2, 0]}>
          <ringGeometry args={[4.5, 14.0, 96]} />
          <meshBasicMaterial
            map={accretionTexture}
            transparent
            opacity={0.88}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Relativistic Plasma Jet Columns */}
        <mesh position={[0, 8, 0]}>
          <cylinderGeometry args={[0.2, 0.8, 16, 16]} />
          <meshBasicMaterial
            color="#64DFFF"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, -8, 0]}>
          <cylinderGeometry args={[0.8, 0.2, 16, 16]} />
          <meshBasicMaterial
            color="#64DFFF"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 2. Interstellar Comet with Glowing Nucleus and Ion/Dust Tail */}
      <group ref={cometGroupRef} position={[-20, 15, 60]}>
        {/* Luminous Ice Nucleus */}
        <mesh>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshBasicMaterial color="#E8F8FF" />
        </mesh>

        {/* Cyan Ion Coma Halo */}
        <mesh>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial
            color="#64DFFF"
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Tapered Ion / Dust Tail */}
        <mesh position={[0, 0, -6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[1.8, 12, 16]} />
          <meshBasicMaterial
            color="#64DFFF"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 3. Outer Asteroid Belt Ring */}
      <points ref={asteroidPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[asteroids.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[asteroids.col, 3]} />
          <bufferAttribute attach="attributes-size" args={[asteroids.sz, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.8}
          vertexColors
          transparent
          opacity={0.65}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

