'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

interface StellarGeometryProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

export function StellarGeometry({
  sensitivity = 1.0,
  reducedMotion = false,
}: StellarGeometryProps) {
  const outerPolyRef = useRef<THREE.Mesh>(null);
  const midPolyRef = useRef<THREE.Mesh>(null);
  const innerPolyRef = useRef<THREE.Mesh>(null);
  const geodesicRingRef = useRef<THREE.LineSegments>(null);
  const orbitingNodesRef = useRef<THREE.Points>(null);

  // Parametric Geodesic Orbiting Nodes
  const { nodePositions, nodeColors } = useMemo(() => {
    const count = 360;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = (i / count) * Math.PI * 4;
      const v = (i / count) * Math.PI * 2;
      // Viviani's curve / spherical trefoil
      const r = 13.5;
      pos[i * 3] = r * (1 + Math.cos(u)) * Math.cos(v) * 0.5;
      pos[i * 3 + 1] = r * Math.sin(u) * 0.7;
      pos[i * 3 + 2] = r * (1 + Math.cos(u)) * Math.sin(v) * 0.5;

      // Cyan to Gold gradient
      col[i * 3] = 0.4 + (i / count) * 0.5;
      col[i * 3 + 1] = 0.8;
      col[i * 3 + 2] = 1.0 - (i / count) * 0.4;
    }

    return { nodePositions: pos, nodeColors: col };
  }, []);

  // Geodesic Wireframe Circle Network
  const circleLines = useMemo(() => {
    const segments = 120;
    const pos: number[] = [];

    const addRing = (rad: number, rotX: number, rotY: number) => {
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const p1 = new THREE.Vector3(Math.cos(a1) * rad, Math.sin(a1) * rad, 0);
        const p2 = new THREE.Vector3(Math.cos(a2) * rad, Math.sin(a2) * rad, 0);
        p1.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotX);
        p1.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        p2.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotX);
        p2.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        pos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    };

    addRing(15, 0, 0);
    addRing(15, Math.PI / 3, Math.PI / 4);
    addRing(15, -Math.PI / 3, -Math.PI / 4);
    addRing(15, Math.PI / 2, 0);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);

    // 1. Outer Icosahedral Lattice
    if (outerPolyRef.current && !reducedMotion) {
      outerPolyRef.current.rotation.x += delta * (0.2 + metrics.bass * 0.5);
      outerPolyRef.current.rotation.y += delta * (0.15 + metrics.mid * 0.4);
      const s = 1.0 + metrics.subBass * 0.45;
      outerPolyRef.current.scale.set(s, s, s);
    }

    // 2. Middle Octahedron Ring
    if (midPolyRef.current && !reducedMotion) {
      midPolyRef.current.rotation.y -= delta * (0.3 + metrics.treble * 0.6);
      midPolyRef.current.rotation.z += delta * (0.25 + metrics.lowMid * 0.4);
      const s = 1.0 + metrics.mid * 0.5;
      midPolyRef.current.scale.set(s, s, s);
    }

    // 3. Inner Dodecahedral Pulsing Core
    if (innerPolyRef.current) {
      const s = 1.0 + metrics.bass * 0.8 + metrics.transient * 0.6;
      innerPolyRef.current.scale.set(s, s, s);
      if (!reducedMotion) {
        innerPolyRef.current.rotation.x -= delta * (0.4 + metrics.highMid * 0.5);
      }
    }

    // 4. Geodesic Rings & Nodes
    if (geodesicRingRef.current && !reducedMotion) {
      geodesicRingRef.current.rotation.y += delta * 0.12;
      geodesicRingRef.current.rotation.z -= delta * 0.08;
    }

    if (orbitingNodesRef.current && !reducedMotion) {
      orbitingNodesRef.current.rotation.y -= delta * 0.35;
      orbitingNodesRef.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <group name="stellar-geometry-master">
      {/* Outer Polyhedral Wireframe Shell */}
      <mesh ref={outerPolyRef}>
        <icosahedronGeometry args={[14.5, 1]} />
        <meshStandardMaterial
          color="#64DFFF"
          emissive="#64DFFF"
          emissiveIntensity={0.6}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Middle Octahedral Rotating Ring */}
      <mesh ref={midPolyRef}>
        <octahedronGeometry args={[9.5, 0]} />
        <meshStandardMaterial
          color="#E8BC83"
          emissive="#8C6CFF"
          emissiveIntensity={0.8}
          roughness={0.15}
          metalness={0.9}
          wireframe
        />
      </mesh>

      {/* Inner Solid Geometric Core */}
      <mesh ref={innerPolyRef}>
        <dodecahedronGeometry args={[5.0, 0]} />
        <meshStandardMaterial
          color="#8C6CFF"
          emissive="#64DFFF"
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Interlocking Geodesic Rings */}
      <lineSegments ref={geodesicRingRef} geometry={circleLines}>
        <lineBasicMaterial
          color="#64DFFF"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Orbiting Parametric Nodes */}
      <points ref={orbitingNodesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[nodeColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={2.2}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
