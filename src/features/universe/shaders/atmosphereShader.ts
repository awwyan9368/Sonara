import * as THREE from 'three';

/**
 * Physically Inspired Rayleigh & Mie Atmospheric Scattering Shader
 * Simulates atmospheric limb brightening, sunset wavelength extinction, and forward scattering.
 * - Day side: Luminous Rayleigh blue/cyan scattering.
 * - Terminator: Golden-amber and crimson sunset rim extinction.
 * - Night side: Deep dark extinction with subtle stellar back-illumination.
 */
export function createAtmosphereMaterial(
  baseColor: string = '#64DFFF',
  sunsetShift = 1.0,
  intensity = 1.25
): THREE.ShaderMaterial {
  const primaryColor = new THREE.Color(baseColor);
  
  // Sunset color is computed as complementary wavelength shift (golden-orange/amber)
  const sunsetColor = primaryColor.clone().offsetHSL(0.12, 0.25, -0.08);

  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uPrimaryColor;
      uniform vec3 uSunsetColor;
      uniform float uIntensity;
      uniform vec3 uLightDirection;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewDir);
        vec3 L = normalize(uLightDirection);

        // Grazing angle Fresnel term (power 2.8 for razor-sharp planetary limb glow)
        float vDotN = clamp(dot(V, N), 0.0, 1.0);
        float fresnel = pow(1.0 - vDotN, 2.8) * uIntensity;

        // Sunlight alignment on sphere surface
        float nDotL = dot(N, L);

        // Smooth Day / Night terminator transition
        float dayFactor = smoothstep(-0.25, 0.45, nDotL);
        float twilightBand = 1.0 - smoothstep(0.0, 0.35, abs(nDotL));

        // Atmospheric color blending:
        // Transition from primary atmosphere color (day) to warm sunset gold/red (terminator)
        vec3 atmoColor = mix(uPrimaryColor, uSunsetColor, twilightBand * 0.85);

        // Forward Mie scattering: slight glare when looking towards light source
        float vDotL = max(0.0, dot(-V, L));
        float mieGlow = pow(vDotL, 6.0) * 0.45 * dayFactor;

        // Combined atmosphere radiance: rim glow concentrated at silhouette
        float alpha = fresnel * (dayFactor * 0.95 + mieGlow + 0.12);

        gl_FragColor = vec4(atmoColor, alpha);
      }
    `,
    uniforms: {
      uPrimaryColor: { value: primaryColor },
      uSunsetColor: { value: sunsetColor },
      uIntensity: { value: intensity },
      uLightDirection: { value: new THREE.Vector3(60, 80, 50).normalize() },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false,
  });
}
