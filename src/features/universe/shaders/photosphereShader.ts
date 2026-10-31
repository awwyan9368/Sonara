import * as THREE from 'three';

/**
 * AAA Photorealistic Stellar Photosphere Shader
 * Simulates:
 * 1. Boiling convective plasma granules (Voronoi / cell noise) evolving with time.
 * 2. Magnetic flux turbulence and solar prominence filaments.
 * 3. Accurate physical solar limb darkening with radiant white-hot core bulge.
 * 4. Spectral classification color transitions.
 */
export function createPhotosphereMaterial(
  colorHex: string = '#FFFFFF',
  prominence: number = 75
): THREE.ShaderMaterial {
  const spectralColor = new THREE.Color(colorHex);
  
  // Cooler limb spectral tint (slightly more saturated)
  const limbColor = spectralColor.clone().offsetHSL(0.02, 0.25, -0.15);

  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uLimbColor;
      uniform float uTime;
      uniform float uProminence;
      uniform float uHovered;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;

      // Pseudo-3D Simplex & Voronoi Noise for Plasma Granules
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
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
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      }

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewDir);

        // View dot normal: mu = cos(theta)
        float mu = max(0.0, dot(N, V));

        // Boiling Convective Granulation (Multi-frequency Simplex noise)
        vec3 p = N * 5.5 + vec3(0.0, uTime * 0.12, uTime * 0.08);
        float n1 = snoise(p);
        float n2 = snoise(p * 2.5 + vec3(uTime * 0.18, 0.0, 0.0)) * 0.5;
        float n3 = snoise(p * 5.0 - vec3(0.0, uTime * 0.25, 0.0)) * 0.25;
        float granule = (n1 + n2 + n3);

        // Magnetic loops and hot solar flares
        float flare = smoothstep(0.35, 0.75, abs(snoise(N * 3.0 + vec3(uTime * 0.4))));

        // Physical Solar Limb Darkening:
        // Center of star disk is intensely radiant white-hot (mu ~ 1.0)
        // Limb of star disk falls off smoothly into rich saturated spectral color
        float limbDarkening = pow(mu, 0.55);
        float coreHotSpot = pow(mu, 2.2);

        // Dynamic plasma color mixing:
        // Hot rising granules -> Pure white hot
        // Cooler falling lanes -> Deep spectral color
        vec3 plasmaCol = mix(uLimbColor, uColor, granule * 0.4 + 0.6);
        
        // Add solar flare highlights
        plasmaCol += vec3(0.4, 0.35, 0.25) * flare * (uProminence * 0.01);

        // Core bloom: white-hot blinding center
        vec3 finalColor = mix(plasmaCol, vec3(1.0, 1.0, 1.0), coreHotSpot * 0.85);
        finalColor *= (0.85 + limbDarkening * 0.4 + uHovered * 0.4);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    uniforms: {
      uColor: { value: spectralColor },
      uLimbColor: { value: limbColor },
      uTime: { value: 0 },
      uProminence: { value: prominence },
      uHovered: { value: 0 },
    },
  });
}

