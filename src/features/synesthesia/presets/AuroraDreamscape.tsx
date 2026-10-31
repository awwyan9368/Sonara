'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getEnergySparkTexture } from '../../universe/shaders/particleTextures';

interface AuroraDreamscapeProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

// Custom GLSL Shader for Altitude-Dependent Atmospheric Aurora Curtain Emission
const AuroraCurtainShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Sinuous geomagnetic Rossby wave folds (modulated by bass & mid)
      float wave1 = sin(pos.x * 0.12 + uTime * 0.8) * (2.8 + uBass * 3.5);
      float wave2 = cos(pos.x * 0.28 - uTime * 1.2) * (1.2 + uMid * 2.0);
      
      // Top edge flutters with higher frequency
      float topFlutter = uv.y * sin(pos.x * 0.5 + uTime * 2.5) * (0.8 + uMid * 1.2);

      pos.z += wave1 + wave2 + topFlutter;

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uTreble;
    uniform float uBass;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      // Altitude vUv.y: 0.0 = Base (100km), 1.0 = Crest (250km)
      float altitude = vUv.y;

      // Soft lateral horizontal edge falloff so the curtain ends feather smoothly into deep space
      float horizFalloff = smoothstep(0.0, 0.28, vUv.x) * (1.0 - smoothstep(0.72, 1.0, vUv.x));

      // 1. Physically Inspired Atmospheric Ionization Colors:
      // Base: Atomic oxygen 557.7nm emerald green
      vec3 emeraldBase  = vec3(0.05, 0.95, 0.45);
      // Mid: Nitrogen ion 391.4nm electric turquoise/cyan
      vec3 turquoiseMid = vec3(0.10, 0.78, 0.98);
      // Crest: High altitude atomic oxygen 630.0nm & nitrogen violet/magenta
      vec3 magentaCrest = vec3(0.88, 0.22, 0.82);

      vec3 color = mix(emeraldBase, turquoiseMid, smoothstep(0.06, 0.48, altitude));
      color = mix(color, magentaCrest, smoothstep(0.48, 0.92, altitude));

      // 2. Vertical Ray Striations
      float rayNoise = sin(vWorldPosition.x * 0.75 + uTime * 1.5) * 0.5 + 0.5;
      float fineRay = sin(vWorldPosition.x * 2.2 - uTime * 2.8) * 0.5 + 0.5;
      float rays = 0.7 + (rayNoise * 0.3 + fineRay * 0.3) * (0.8 + uTreble * 1.2);

      // 3. Vertical curtain opacity profile: tight base, glowing body, ethereal top taper
      float vertFalloff = smoothstep(0.0, 0.1, altitude) * (1.0 - smoothstep(0.65, 0.96, altitude));
      
      float alpha = vertFalloff * horizFalloff * rays * (0.24 + uBass * 0.16);

      gl_FragColor = vec4(color * (1.0 + uTreble * 0.4), alpha);
    }
  `,
};

export function AuroraDreamscape({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: AuroraDreamscapeProps) {
  const curtain1Ref = useRef<THREE.Mesh>(null);
  const curtain2Ref = useRef<THREE.Mesh>(null);
  const curtain3Ref = useRef<THREE.Mesh>(null);
  const shader1Ref = useRef<THREE.ShaderMaterial>(null);
  const shader2Ref = useRef<THREE.ShaderMaterial>(null);
  const shader3Ref = useRef<THREE.ShaderMaterial>(null);
  const ionSparksRef = useRef<THREE.Points>(null);

  const particleCount = Math.floor(1800 * particleDensity);

  // 3 Geodesic Curtain Ribbon Geometries (High horizontal density for natural wave folding)
  const { curtainGeo1, curtainGeo2, curtainGeo3 } = useMemo(() => {
    return {
      curtainGeo1: new THREE.PlaneGeometry(78, 26, 128, 24),
      curtainGeo2: new THREE.PlaneGeometry(84, 30, 128, 24),
      curtainGeo3: new THREE.PlaneGeometry(72, 22, 128, 24),
    };
  }, []);

  // Suspended Ionization Stardust Particles
  const { initialParticleData, sparkPositions, sparkColors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const initialData: Array<{ x: number; y: number; z: number; speed: number }> = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 65;
      const y = (Math.random() - 0.5) * 26;
      const z = (Math.random() - 0.5) * 20 - 4;
      const speed = 0.3 + Math.random() * 0.7;

      initialData.push({ x, y, z, speed });

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Oxygen Emerald -> Cyan -> Nitrogen Magenta
      const t = Math.random();
      if (t < 0.45) {
        col[i * 3] = 0.1; col[i * 3 + 1] = 0.98; col[i * 3 + 2] = 0.55; // Emerald
      } else if (t < 0.8) {
        col[i * 3] = 0.22; col[i * 3 + 1] = 0.88; col[i * 3 + 2] = 1.0; // Cyan
      } else {
        col[i * 3] = 0.92; col[i * 3 + 1] = 0.35; col[i * 3 + 2] = 0.95; // Magenta
      }
    }

    return { initialParticleData: initialData, sparkPositions: pos, sparkColors: col };
  }, [particleCount]);

  // Shader Uniforms for the 3 curtains
  const uniforms1 = useMemo(() => ({ uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 } }), []);
  const uniforms2 = useMemo(() => ({ uTime: { value: 10 }, uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 } }), []);
  const uniforms3 = useMemo(() => ({ uTime: { value: 20 }, uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 } }), []);

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Update Curtain Shaders
    if (shader1Ref.current) {
      shader1Ref.current.uniforms.uTime.value = time;
      shader1Ref.current.uniforms.uBass.value = metrics.bass + metrics.subBass * 0.7;
      shader1Ref.current.uniforms.uMid.value = metrics.mid;
      shader1Ref.current.uniforms.uTreble.value = metrics.treble;
    }
    if (shader2Ref.current) {
      shader2Ref.current.uniforms.uTime.value = time * 0.85 + 5.0;
      shader2Ref.current.uniforms.uBass.value = metrics.bass * 0.9;
      shader2Ref.current.uniforms.uMid.value = metrics.mid * 1.1;
      shader2Ref.current.uniforms.uTreble.value = metrics.treble;
    }
    if (shader3Ref.current) {
      shader3Ref.current.uniforms.uTime.value = time * 1.15 + 12.0;
      shader3Ref.current.uniforms.uBass.value = metrics.subBass;
      shader3Ref.current.uniforms.uMid.value = metrics.lowMid;
      shader3Ref.current.uniforms.uTreble.value = metrics.presence;
    }

    // 2. Slow lateral undulating drift of the magnetic curtains
    if (!reducedMotion) {
      if (curtain1Ref.current) curtain1Ref.current.position.x = Math.sin(time * 0.2) * 2.0;
      if (curtain2Ref.current) curtain2Ref.current.position.x = Math.cos(time * 0.18) * 2.5;
      if (curtain3Ref.current) curtain3Ref.current.position.x = Math.sin(time * 0.25 + 1.0) * 1.8;
    }

    // 3. Ionization Stardust Gentle Drift (Zero cumulative mutation)
    if (ionSparksRef.current && !reducedMotion) {
      const posAttr = ionSparksRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const d = initialParticleData[i];
        // Drift upwards like atmospheric charged particles
        const yDrift = ((time * d.speed * (0.8 + metrics.treble * 1.2) + d.y + 13.0) % 26.0) - 13.0;
        const xDrift = d.x + Math.sin(time * 0.3 + d.y * 0.2) * 1.5;

        positions[i * 3] = xDrift;
        positions[i * 3 + 1] = yDrift;
        positions[i * 3 + 2] = d.z;
      }
      posAttr.needsUpdate = true;
    }
  });

  const sparkTexture = useMemo(() => getEnergySparkTexture(), []);

  return (
    <group name="aurora-dreamscape-v2" position={[0, -4, 0]}>
      {/* 1. Main Emerald/Turquoise Atmospheric Ribbon (Foreground) */}
      <mesh ref={curtain1Ref} geometry={curtainGeo1} position={[0, 2, -14]}>
        <shaderMaterial
          ref={shader1Ref}
          vertexShader={AuroraCurtainShader.vertexShader}
          fragmentShader={AuroraCurtainShader.fragmentShader}
          uniforms={uniforms1}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Secondary Interwoven Curtain (Midground, shifted in depth) */}
      <mesh ref={curtain2Ref} geometry={curtainGeo2} position={[3, 4, -22]} rotation={[0, 0.1, 0]}>
        <shaderMaterial
          ref={shader2Ref}
          vertexShader={AuroraCurtainShader.vertexShader}
          fragmentShader={AuroraCurtainShader.fragmentShader}
          uniforms={uniforms2}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. High-Altitude Magenta Fringe Curtain (Background) */}
      <mesh ref={curtain3Ref} geometry={curtainGeo3} position={[-3, 3, -30]} rotation={[0, -0.08, 0]}>
        <shaderMaterial
          ref={shader3Ref}
          vertexShader={AuroraCurtainShader.vertexShader}
          fragmentShader={AuroraCurtainShader.fragmentShader}
          uniforms={uniforms3}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Suspended Ionization Stardust Drift */}
      <points ref={ionSparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[sparkColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sparkTexture}
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
