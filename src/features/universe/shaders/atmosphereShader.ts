import * as THREE from 'three';

/**
 * Custom GLSL Fresnel Atmospheric Scattering Shader
 * Features:
 * - View-dependent Fresnel rim glow
 * - Light-direction attenuation (atmosphere glows on the day side, gently dims on the night side)
 * - Additive blending with depth-aware transparency
 */
export function createAtmosphereMaterial(color: string = '#64DFFF', intensity = 1.2): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform vec3 uLightDirection;
      
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        
        // Fresnel calculation: strong glow at grazing angles
        float fresnel = 1.0 - max(0.0, dot(viewDir, vNormal));
        fresnel = pow(fresnel, 2.8) * uIntensity;
        
        // Day/night terminator modulation: light alignment
        float lightAlignment = dot(vNormal, normalize(uLightDirection));
        float dayFactor = smoothstep(-0.25, 0.6, lightAlignment);
        
        // Delicate back-scatter rim glow even on dark side
        float atmosphereGlow = fresnel * (dayFactor * 0.85 + 0.15);
        
        gl_FragColor = vec4(uColor, atmosphereGlow);
      }
    `,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uLightDirection: { value: new THREE.Vector3(50, 100, 50).normalize() },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

