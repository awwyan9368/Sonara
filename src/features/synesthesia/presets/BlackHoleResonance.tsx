'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getEnergySparkTexture } from '../../universe/shaders/particleTextures';

interface BlackHoleResonanceProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

// Custom GLSL Shader for Relativistic Accretion Disk with Doppler Beaming & Gravitational Lensing
const AccretionDiskShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uBass;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vRadius;
    varying vec2 vDir;

    void main() {
      vUv = uv;
      vRadius = length(position.xy);
      vec2 dir = position.xy / max(vRadius, 0.0001);
      vDir = dir;

      // Smooth double-harmonic displacement without branch cuts
      float sin2T = 2.0 * dir.x * dir.y;
      float cos2T = dir.x * dir.x - dir.y * dir.y;
      float wave = sin2T * cos(uTime * 2.5) + cos2T * sin(uTime * 2.5);

      vec3 pos = position;
      float flare = pow(vRadius / 26.0, 1.3) * (0.4 + uBass * 0.3);
      pos.z += wave * flare * 0.3;

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uMid;
    uniform float uBass;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vRadius;
    varying vec2 vDir;

    void main() {
      float innerR = 4.2;
      float outerR = 25.0;
      if (vRadius < innerR || vRadius > outerR) discard;

      float normR = (vRadius - innerR) / (outerR - innerR);

      // Continuous Relativistic Doppler Beaming
      float dopplerFactor = vDir.y * cos(uTime * 0.8) + vDir.x * sin(uTime * 0.8);
      float beaming = clamp(1.0 + dopplerFactor * 0.75, 0.25, 2.0);

      // Radial temperature gradient: Innermost is ionized blue-white, middle is amber, outer is red
      vec3 innerHot = vec3(0.55, 0.92, 1.0);
      vec3 midAmber = vec3(1.0, 0.65, 0.2);
      vec3 outerRed = vec3(0.75, 0.12, 0.05);

      vec3 baseCol = mix(innerHot, midAmber, smoothstep(0.0, 0.45, normR));
      baseCol = mix(baseCol, outerRed, smoothstep(0.45, 0.95, normR));

      if (dopplerFactor > 0.0) {
        baseCol = mix(baseCol, vec3(0.7, 0.95, 1.0), dopplerFactor * 0.45);
      } else {
        baseCol = mix(baseCol, vec3(0.5, 0.05, 0.02), abs(dopplerFactor) * 0.6);
      }

      // Continuous spiral modulation via 4th harmonic
      float sin4T = 2.0 * (2.0 * vDir.x * vDir.y) * (vDir.x * vDir.x - vDir.y * vDir.y);
      float spiral = sin(sin4T * 2.0 - vRadius * 1.8 + uTime * 3.5) * 0.25 + 0.75;
      float alpha = (1.0 - pow(normR, 1.8)) * smoothstep(0.0, 0.08, normR) * spiral;

      vec3 finalColor = baseCol * beaming * (1.1 + uMid * 0.9 + uBass * 0.5);
      gl_FragColor = vec4(finalColor, alpha * 0.85);
    }
  `,
};

export function BlackHoleResonance({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: BlackHoleResonanceProps) {
  const diskMeshRef = useRef<THREE.Mesh>(null);
  const diskShaderRef = useRef<THREE.ShaderMaterial>(null);
  const jetHelicesRef = useRef<THREE.Group>(null);
  const infallingSparksRef = useRef<THREE.Points>(null);

  const particleCount = Math.floor(2000 * particleDensity);

  // 1. Dual Collimated Relativistic Helical Magnetic Jets
  const jetHelicesData = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];
    const helixCount = 8;
    const segments = 100;

    for (let h = 0; h < helixCount; h++) {
      const isTop = h < 4;
      const angleOffset = ((h % 4) / 4) * Math.PI * 2;
      const positions: number[] = [];

      const getPoint = (t: number) => {
        const yDist = 3.5 + t * 32.0; // Height
        const radius = 0.8 + t * 4.2;  // Flaring opening angle
        const angle = angleOffset + t * Math.PI * 6; // Corkscrew twist
        return [
          Math.cos(angle) * radius,
          isTop ? yDist : -yDist,
          Math.sin(angle) * radius,
        ];
      };

      for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        const p1 = getPoint(t1);
        const p2 = getPoint(t2);
        positions.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometries.push(geo);
    }

    return geometries;
  }, []);

  // 2. Relativistic Infalling Particles (Geodesic Keplerian Infall)
  const { initialInfallData, infallPositions, infallColors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const initialData: Array<{
      initialR: number;
      initialTheta: number;
      speed: number;
      zJitter: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const r = 4.3 + Math.pow(Math.random(), 1.5) * 20.0;
      const theta = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 0.8;
      const zJitter = (Math.random() - 0.5) * 0.8;

      initialData.push({ initialR: r, initialTheta: theta, speed, zJitter });

      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.sin(theta) * r;
      pos[i * 3 + 2] = zJitter;

      // Doppler / temperature coloring
      const normR = (r - 4.3) / 20.0;
      if (normR < 0.25) {
        col[i * 3] = 0.45; col[i * 3 + 1] = 0.9; col[i * 3 + 2] = 1.0;
      } else if (normR < 0.65) {
        col[i * 3] = 0.95; col[i * 3 + 1] = 0.65; col[i * 3 + 2] = 0.25;
      } else {
        col[i * 3] = 0.85; col[i * 3 + 1] = 0.18; col[i * 3 + 2] = 0.08;
      }
    }

    return { initialInfallData: initialData, infallPositions: pos, infallColors: col };
  }, [particleCount]);

  // Accretion disk uniforms
  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Accretion Disk Shader Uniforms & Rotation
    if (diskShaderRef.current) {
      diskShaderRef.current.uniforms.uTime.value = time;
      diskShaderRef.current.uniforms.uBass.value = metrics.bass + metrics.subBass * 0.8;
      diskShaderRef.current.uniforms.uMid.value = metrics.mid;
    }

    if (diskMeshRef.current && !reducedMotion) {
      diskMeshRef.current.rotation.z += delta * (0.35 + metrics.mid * 0.5);
    }

    // 3. Relativistic Magnetic Jets Pulsing & Twist
    if (jetHelicesRef.current && !reducedMotion) {
      jetHelicesRef.current.rotation.y += delta * (1.2 + metrics.treble * 1.5);
      const jetScaleY = 1.0 + metrics.bass * 0.8 + metrics.transient * 1.0;
      jetHelicesRef.current.scale.set(1.0, jetScaleY, 1.0);
    }

    // 4. Infalling Relativistic Particle Streams (Immutable references)
    if (infallingSparksRef.current && !reducedMotion) {
      const posAttr = infallingSparksRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const d = initialInfallData[i];
        // Relativistic spiral infall: r decreases over time, then wraps back to outer edge
        const fallSpeed = d.speed * (1.0 + metrics.bass * 0.8);
        const cycle = (time * fallSpeed * 1.8 + d.initialR) % 20.0;
        const currentR = 24.3 - cycle; // 24.3 down to 4.3

        // Keplerian angular velocity increases dramatically near horizon: omega ~ r^(-1.5)
        const omega = Math.pow(15.0 / Math.max(4.5, currentR), 1.5) * 2.2;
        const currentTheta = d.initialTheta + time * omega;

        positions[i * 3] = Math.cos(currentTheta) * currentR;
        positions[i * 3 + 1] = Math.sin(currentTheta) * currentR;
        positions[i * 3 + 2] = d.zJitter * (currentR / 20.0);
      }
      posAttr.needsUpdate = true;
    }
  });

  const sparkTexture = useMemo(() => getEnergySparkTexture(), []);

  return (
    <group name="black-hole-resonance-v2">
      {/* 1. Pitch-Black Schwarzschild Event Horizon */}
      <mesh>
        <sphereGeometry args={[3.8, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 2. Razor-Sharp Gravitational Photon Sphere (Einstein Ring) */}
      <mesh>
        <ringGeometry args={[3.82, 4.3, 96]} />
        <meshBasicMaterial
          color="#DCF8FF"
          side={THREE.DoubleSide}
          transparent
          opacity={0.98}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Relativistic Accretion Disk & Infalling Particles (Cinematic 68-deg inclination) */}
      <group rotation={[-1.22, 0, 0]}>
        <mesh ref={diskMeshRef}>
          <ringGeometry args={[4.2, 26.0, 96, 24]} />
          <shaderMaterial
            ref={diskShaderRef}
            vertexShader={AccretionDiskShader.vertexShader}
            fragmentShader={AccretionDiskShader.fragmentShader}
            uniforms={diskUniforms}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 5. Infalling Matter Spiral Streamers (Coplanar with Accretion Disk) */}
        <points ref={infallingSparksRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[infallPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[infallColors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            map={sparkTexture}
            size={1.9}
            vertexColors
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>

      {/* 5. Dual Collimated Relativistic Helical Jets */}
      <group ref={jetHelicesRef}>
        {jetHelicesData.map((geo, idx) => {
          const isCyan = idx % 2 === 0;
          return (
            <lineSegments key={`jet-helix-${idx}`} geometry={geo}>
              <lineBasicMaterial
                color={isCyan ? '#64DFFF' : '#A882FF'}
                transparent
                opacity={0.7}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </lineSegments>
          );
        })}
      </group>


    </group>
  );
}
