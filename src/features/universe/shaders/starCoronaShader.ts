import * as THREE from 'three';

/**
 * Custom GLSL Star Corona & Solar Flare Shader
 * Generates an animated solar atmosphere with limb darkening, solar flares, and soft additive radiance.
 */
export function createStarCoronaMaterial(colorHex: string = '#FFE8D6', size = 1.0): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      // Simple 3D noise approximation
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float edge = dot(viewDir, vNormal);
        
        // Solar prominence turbulence
        float flare = noise(vPosition * 2.5 + vec3(0.0, uTime * 0.8, uTime * 0.4));
        
        // Limb darkening & radial falloff
        float intensity = pow(1.0 - abs(edge), 2.2) * (0.8 + flare * 0.5);
        
        vec3 coronaColor = mix(uColor, vec3(1.0, 1.0, 1.0), edge * 0.7);
        gl_FragColor = vec4(coronaColor, intensity * 0.75);
      }
    `,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uTime: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

