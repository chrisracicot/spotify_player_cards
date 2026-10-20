// Jewel Case Plastic Shader
// Custom GLSL simulating clear polystyrene jewel case, subtle iridescent sheen,
// internal booklet depth, specular plastic streak, and frosted/ribbed sidewalls.

import * as THREE from './public/vendor/three.module.js';

export const JewelCaseShader = {
  uniforms: {
    tCover: { value: null },
    uThickness: { value: 0.08 },
    uPlasticGloss: { value: 0.85 },
    uPlasticIridescence: { value: 0.45 },
    uLightPos: { value: new THREE.Vector3(2.5, 4.0, 3.5) },
    uRoughness: { value: 0.12 },
    uSpineRibs: { value: 1.0 },
    uCaseTint: { value: new THREE.Color(0.95, 0.98, 1.0) },
    uResolution: { value: new THREE.Vector2(1.0, 1.0) }
  },


  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vObjectNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vObjectNormal = normal; // Local geometry normal for exact face classification
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    precision highp float;

    uniform sampler2D tCover;
    uniform float uThickness;
    uniform float uPlasticGloss;
    uniform float uPlasticIridescence;
    uniform vec3 uLightPos;
    uniform float uRoughness;
    uniform vec3 uCaseTint;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vObjectNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    // Spectral iridescent sheen for optical plastic film
    vec3 spectralColor(float t) {
      vec3 w = vec3(
        0.5 + 0.5 * cos(6.28318 * (t + 0.0)),
        0.5 + 0.5 * cos(6.28318 * (t + 0.33)),
        0.5 + 0.5 * cos(6.28318 * (t + 0.67))
      );
      return w;
    }

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPosition);
      vec3 L = normalize(uLightPos - vWorldPosition);
      vec3 H = normalize(L + V);

      // Classify faces using Object-Space normal so front face stays visible up to ~89.9°
      bool isFront = vObjectNormal.z > 0.45;
      bool isBack = vObjectNormal.z < -0.45;
      bool isEdge = !isFront && !isBack;

      // Fresnel reflection (Schlick approximation for clear polystyrene / plastic, n ≈ 1.58 -> F0 ≈ 0.05)
      float NdotV = max(dot(N, V), 0.0);
      float F0 = 0.05;
      float fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 4.5);

      // Specular highlight: Sharp clear plastic shine streak
      float NdotH = max(dot(N, H), 0.0);
      float specPower = mix(25.0, 140.0, uPlasticGloss);
      float spec = pow(NdotH, specPower);

      // Secondary broad glossy sheen
      float broadSpec = pow(NdotH, 10.0) * 0.25;

      // Iridescent dispersion: subtle optical color bands in the specular reflection
      float sheenAngle = dot(N, V) * 1.5 + dot(N, L) * 0.8;
      vec3 iridColor = spectralColor(sheenAngle * 1.8);

      vec3 finalColor = vec3(0.0);

      if (isFront) {
        // FRONT FACE: Album cover beneath clear plastic jewel case
        // Stretched closer to the edge with a minimal crisp jewel case border
        vec4 coverTex = texture2D(tCover, vUv);
        vec3 artColor = coverTex.rgb;

        // Very slim 0.8% jewel case clear rim
        float borderInset = 0.008;
        bool inBorder = vUv.x < borderInset || vUv.x > (1.0 - borderInset) ||
                        vUv.y < borderInset || vUv.y > (1.0 - borderInset);

        if (inBorder) {
          artColor = mix(coverTex.rgb * 0.5, vec3(0.92, 0.96, 1.0) * 0.25, 0.8);
        }

        // Combine album cover with plastic gloss
        vec3 plasticReflection = vec3(1.0) * spec * (uPlasticGloss * 1.1) +
                                iridColor * (fresnel * uPlasticIridescence * 0.8) +
                                vec3(1.0) * broadSpec * 0.2;

        finalColor = artColor * uCaseTint + plasticReflection;

        // Subtle jewel-case diagonal ambient light streak across the surface
        float streak = smoothstep(0.42, 0.52, sin((vUv.x + vUv.y) * 4.0 + dot(V, vec3(1.0)) * 2.0));
        finalColor += vec3(0.08) * streak * uPlasticGloss * fresnel;

      } else if (isBack) {
        // BACK FACE: Clean solid CD tray back (dark smoke/grey tray plastic, NO image)
        vec3 trayColor = vec3(0.12, 0.13, 0.15);
        vec3 plasticReflection = vec3(1.0) * spec * uPlasticGloss * 0.7;
        finalColor = trayColor * uCaseTint + plasticReflection;

      } else {
        // EDGES & SIDEWALLS: Authentic clean translucent polystyrene CD case edges (NO image)
        vec3 edgePlasticBase = vec3(0.85, 0.89, 0.94);
        float rim = pow(1.0 - NdotV, 2.2);

        // Clean plastic sidewall with subtle refraction depth and specular glint
        finalColor = edgePlasticBase * 0.35 + vec3(1.0) * (spec * 1.5 + rim * 0.5 * uPlasticGloss) + (iridColor * fresnel * 0.25);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

