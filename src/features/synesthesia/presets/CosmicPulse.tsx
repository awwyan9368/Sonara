'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';
import { getEnergySparkTexture, getNebulaDustTexture } from '../../universe/shaders/particleTextures';

interface CosmicPulseProps {
  sensitivity?: number;
  particleDensity?: number;
  reducedMotion?: boolean;
}

// Custom GLSL Shader for Magnetohydrodynamic Plasma Photosphere
const PlasmaCoreShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uTransient;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vDisplacement;

    // Simplex noise helper
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;

      // Turbulent convective plasma boiling
      float n1 = snoise(position * 0.45 + vec3(0.0, uTime * 0.35, uTime * 0.2));
      float n2 = snoise(position * 1.1 - vec3(uTime * 0.4, 0.0, uTime * 0.3)) * 0.5;
      float displacement = (n1 + n2) * (0.28 + uBass * 0.45 + uTransient * 0.6);
      vDisplacement = displacement;

      vec3 newPosition = position + normal * displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vDisplacement;

    void main() {
      // View direction for Fresnel limb darkening
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      float limb = pow(fresnel, 2.4);

      // Convective cell plasma gradient: Deep violet -> incandescent amber -> hot gold -> peak white
      vec3 deepPlasma  = vec3(0.22, 0.04, 0.58); // Deep magnetosphere violet
      vec3 midPlasma   = vec3(0.98, 0.42, 0.08); // Incandescent solar amber
      vec3 hotPlasma   = vec3(1.0, 0.85, 0.38);  // Golden granulation core
      vec3 flareWhite  = vec3(1.0, 0.98, 0.92);  // Peak flare highlight

      float t = clamp((vDisplacement + 0.3) * 1.3 + uBass * 0.25, 0.0, 1.0);
      vec3 color = mix(deepPlasma, midPlasma, smoothstep(0.08, 0.55, t));
      color = mix(color, hotPlasma, smoothstep(0.55, 0.88, t));
      color = mix(color, flareWhite, smoothstep(0.88, 1.0, t));

      // Limb brightening/darkening balance
      color += vec3(0.35, 0.18, 0.85) * limb * (1.1 + uMid * 0.8);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export function CosmicPulse({
  sensitivity = 1.0,
  particleDensity = 1.0,
  reducedMotion = false,
}: CosmicPulseProps) {
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const plasmaShaderRef = useRef<THREE.ShaderMaterial>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const magneticLoopsRef = useRef<THREE.Group>(null);
  const sparksRef = useRef<THREE.Points>(null);

  const particleCount = Math.floor(2200 * particleDensity);

  // 1. Interlocking 3D Magnetic Flux Tube Loops (Bipolar Dipole Arches)
  const fluxLoopsData = useMemo(() => {
    const loopGeometries: THREE.BufferGeometry[] = [];
    const loopCount = 14;

    for (let l = 0; l < loopCount; l++) {
      const segments = 80;
      const positions: number[] = [];
      const angleOffset = (l / loopCount) * Math.PI * 2;
      const inclination = ((l % 4) - 1.5) * 0.45;
      const loopRadius = 6.0 + (l % 5) * 2.2;
      const height = 4.5 + (l % 3) * 2.5;

      const cosI = Math.cos(inclination);
      const sinI = Math.sin(inclination);

      const getPoint = (t: number) => {
        const r = loopRadius * Math.sin(t);
        const y = Math.cos(t) * height;
        const x = r * Math.cos(angleOffset);
        const z = r * Math.sin(angleOffset);
        const rotY = y * cosI - z * sinI;
        const rotZ = y * sinI + z * cosI;
        return [x, rotY, rotZ];
      };

      for (let i = 0; i < segments; i++) {
        const t1 = (i / segments) * Math.PI;
        const t2 = ((i + 1) / segments) * Math.PI;
        const p1 = getPoint(t1);
        const p2 = getPoint(t2);
        positions.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      loopGeometries.push(geo);
    }

    return loopGeometries;
  }, []);

  // 2. Charged Particles Streaming Along Dipole Trajectories
  const { initialParticleData, sparkPositions, sparkColors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const initialData: Array<{
      radius: number;
      theta: number;
      phi: number;
      speed: number;
      colorType: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const r = 3.5 + Math.pow(Math.random(), 1.8) * 45.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.4 + Math.random() * 1.2;
      const colorType = Math.random();

      initialData.push({ radius: r, theta, phi, speed, colorType });

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Cyan / Violet / Solar Gold palette
      if (colorType < 0.4) {
        col[i * 3] = 0.39; col[i * 3 + 1] = 0.87; col[i * 3 + 2] = 1.0; // Cyan
      } else if (colorType < 0.75) {
        col[i * 3] = 0.65; col[i * 3 + 1] = 0.38; col[i * 3 + 2] = 1.0; // Violet
      } else {
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.78; col[i * 3 + 2] = 0.35; // Solar Gold
      }
    }

    return { initialParticleData: initialData, sparkPositions: pos, sparkColors: col };
  }, [particleCount]);

  // Plasma core shader uniforms
  const plasmaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTransient: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const metrics = AudioEngine.getInstance().getEnergyMetrics(sensitivity);
    const time = state.clock.getElapsedTime();

    // 1. Update Plasma Core Shader Uniforms & Pulsation
    if (plasmaShaderRef.current) {
      plasmaShaderRef.current.uniforms.uTime.value = time;
      plasmaShaderRef.current.uniforms.uBass.value = metrics.bass + metrics.subBass * 0.8;
      plasmaShaderRef.current.uniforms.uMid.value = metrics.mid;
      plasmaShaderRef.current.uniforms.uTransient.value = metrics.transient;
    }

    if (coreMeshRef.current) {
      const targetScale = 1.0 + metrics.subBass * 0.4 + metrics.bass * 0.25;
      coreMeshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 15);
      if (!reducedMotion) {
        coreMeshRef.current.rotation.y += delta * (0.2 + metrics.lowMid * 0.5);
      }
    }

    // 2. Coronal Halo Breathing
    if (coronaRef.current) {
      const cScale = 1.0 + metrics.bass * 0.6 + metrics.subBass * 0.4;
      coronaRef.current.scale.set(cScale, cScale, cScale);
      if (!reducedMotion) {
        coronaRef.current.rotation.z += delta * (0.15 + metrics.mid * 0.4);
      }
    }

    // 3. Transient Shockwave Wavefront
    if (shockwaveRef.current) {
      const currentScale = shockwaveRef.current.scale.x;
      if (metrics.transient > 0.35) {
        shockwaveRef.current.scale.set(1.1, 1.1, 1.1);
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = 0.95;
      } else {
        const nextScale = currentScale + delta * (14.0 + metrics.bass * 10.0);
        shockwaveRef.current.scale.set(nextScale, nextScale, nextScale);
        const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, mat.opacity - delta * 1.8);
      }
    }

    // 4. Interlocking Magnetic Flux Loops Dynamic Twist
    if (magneticLoopsRef.current && !reducedMotion) {
      magneticLoopsRef.current.rotation.y += delta * (0.2 + metrics.mid * 0.6);
      magneticLoopsRef.current.rotation.x = Math.sin(time * 0.5) * 0.2 + metrics.bass * 0.15;
      const loopScale = 1.0 + metrics.mid * 0.3 + metrics.lowMid * 0.2;
      magneticLoopsRef.current.scale.set(loopScale, loopScale, loopScale);
    }

    // 5. Charged Particle Streaming Along Field Trajectories (Zero color pollution, immutable reference)
    if (sparksRef.current && !reducedMotion) {
      const posAttr = sparksRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const p = initialParticleData[i];
        // Stream outwards with speed modulated by audio treble/presence
        const travel = (time * p.speed * (1.0 + metrics.treble * 1.5)) % 45.0;
        const currentR = 3.5 + travel;

        // Swirl around magnetic axis
        const curTheta = p.theta + time * 0.15 * p.speed;
        const curPhi = p.phi + Math.sin(time * 0.5 + p.theta) * 0.15;

        positions[i * 3] = currentR * Math.sin(curPhi) * Math.cos(curTheta);
        positions[i * 3 + 1] = currentR * Math.sin(curPhi) * Math.sin(curTheta);
        positions[i * 3 + 2] = currentR * Math.cos(curPhi);
      }
      posAttr.needsUpdate = true;
    }
  });

  const dustTexture = useMemo(() => getNebulaDustTexture(), []);
  const sparkTexture = useMemo(() => getEnergySparkTexture(), []);

  return (
    <group name="cosmic-pulse-v2">
      {/* 1. MHD Convective Plasma Core with Custom GLSL Shader */}
      <mesh ref={coreMeshRef}>
        <sphereGeometry args={[3.2, 96, 96]} />
        <shaderMaterial
          ref={plasmaShaderRef}
          vertexShader={PlasmaCoreShader.vertexShader}
          fragmentShader={PlasmaCoreShader.fragmentShader}
          uniforms={plasmaUniforms}
        />
      </mesh>

      {/* 2. Multi-layered Atmospheric Plasma Corona Billows */}
      <mesh ref={coronaRef} rotation={[0, 0, 0]}>
        <planeGeometry args={[14.5, 14.5]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#A882FF"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]} scale={[1.25, 1.25, 1.25]}>
        <planeGeometry args={[13.0, 13.0]} />
        <meshBasicMaterial
          map={dustTexture}
          color="#64DFFF"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Expanding Transient Shockwave Wavefront Ring */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 4.2, 64]} />
        <meshBasicMaterial
          color="#64DFFF"
          transparent
          opacity={0.0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. 14 Interlocking 3D Bipolar Magnetic Flux Tube Arches */}
      <group ref={magneticLoopsRef}>
        {fluxLoopsData.map((geo, idx) => {
          const isGold = idx % 3 === 0;
          const isCyan = idx % 3 === 1;
          const loopColor = isGold ? '#FFC459' : isCyan ? '#64DFFF' : '#A882FF';
          return (
            <lineSegments key={`flux-loop-${idx}`} geometry={geo}>
              <lineBasicMaterial
                color={loopColor}
                transparent
                opacity={0.7}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </lineSegments>
          );
        })}
      </group>

      {/* 5. Charged Particle Solar Wind Streaming along Trajectories */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[sparkColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sparkTexture}
          size={1.8}
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
