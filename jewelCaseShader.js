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
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
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
    uniform float uSpineRibs;
    uniform vec3 uCaseTint;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    // Spectral iridescent sheen for optical plastic film / thin film interference
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

      // Distinguish faces by normal
      // Front face: N.z > 0.5
      // Back face: N.z < -0.5
      // Sides/Edges: abs(N.z) <= 0.5
      bool isFront = N.z > 0.6;
      bool isBack = N.z < -0.6;
      bool isEdge = !isFront && !isBack;
      bool isLeftSpine = isEdge && N.x < -0.6;

      // Fresnel reflection (Schlick approximation for clear polystyrene / plastic, n ≈ 1.58 -> F0 ≈ 0.05)
      float NdotV = max(dot(N, V), 0.0);
      float F0 = 0.05;
      float fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 4.5);

      // Specular highlight: Sharp clear plastic shine streak
      float NdotH = max(dot(N, H), 0.0);
      float specPower = mix(30.0, 160.0, uPlasticGloss);
      float spec = pow(NdotH, specPower);

      // Secondary broad glossy sheen
      float broadSpec = pow(NdotH, 12.0) * 0.3;

      // Iridescent dispersion: subtle optical color bands in the specular reflection
      float sheenAngle = dot(N, V) * 1.5 + dot(N, L) * 0.8;
      vec3 iridColor = spectralColor(sheenAngle * 1.8);

      vec3 finalColor = vec3(0.0);

      if (isFront) {
        // FRONT FACE: Album cover beneath clear plastic jewel case
        // In a real jewel case, the album booklet sits behind a ~1.2mm front clear tray
        // Slight parallax refraction
        vec2 parallaxUv = vUv - (V.xy * 0.012);
        vec4 coverTex = texture2D(tCover, parallaxUv);

        // CD case plastic border & tab grip accents (authentic jewel case details)
        // Slim clear rim around the booklet
        float borderInset = 0.025;
        bool inBorder = vUv.x < borderInset || vUv.x > (1.0 - borderInset) ||
                        vUv.y < borderInset || vUv.y > (1.0 - borderInset);

        vec3 artColor = coverTex.rgb;

        if (inBorder) {
          // Clear jewel case outer border
          artColor = mix(coverTex.rgb * 0.6, vec3(0.9, 0.95, 1.0) * 0.2, 0.7);
        }

        // Combine album cover with plastic gloss
        // Plastic reflection adds light on top rather than replacing the artwork
        vec3 plasticReflection = vec3(1.0) * spec * (uPlasticGloss * 1.2) +
                                iridColor * (fresnel * uPlasticIridescence * 0.8) +
                                vec3(1.0) * broadSpec * 0.2;

        finalColor = artColor * uCaseTint + plasticReflection;

        // Subtle jewel-case diagonal ambient light streak across the surface
        float streak = smoothstep(0.4, 0.5, sin((vUv.x + vUv.y) * 4.0 + dot(V, vec3(1.0)) * 2.0));
        finalColor += vec3(0.12) * streak * uPlasticGloss * fresnel;

      } else if (isBack) {
        // BACK FACE: CD Inlay tray
        vec4 coverTex = texture2D(tCover, vec2(1.0 - vUv.x, vUv.y));
        // Back of a jewel case is slightly darker inlay with plastic sheen
        vec3 trayColor = coverTex.rgb * 0.75;
        vec3 plasticReflection = vec3(1.0) * spec * uPlasticGloss * 0.8;
        finalColor = trayColor * uCaseTint + plasticReflection;

      } else {
        // EDGES & SIDEWALLS (The thick plastic jewel case boundary)
        // Clear thick polystyrene plastic with internal refraction and glossy rim
        vec3 edgePlasticBase = vec3(0.88, 0.92, 0.96);

        if (isLeftSpine) {
          // Left spine hinge/ribs (authentic 90s CD jewel case ribbed grip lines)
          float ribs = 1.0;
          if (uSpineRibs > 0.5) {
            ribs = 0.75 + 0.25 * sin(vUv.y * 140.0);
          }
          vec3 spineTone = vec3(0.24, 0.26, 0.30);
          finalColor = spineTone * ribs + vec3(1.0) * spec * 1.6 + (iridColor * fresnel * 0.4);
        } else {
          // Top, bottom, and right opening tabs (clean translucent plastic)
          float rim = pow(1.0 - NdotV, 2.5);
          // Plastic edge catches high specular glint
          finalColor = edgePlasticBase * 0.4 + vec3(1.0) * (spec * 1.8 + rim * 0.6 * uPlasticGloss) + (iridColor * fresnel * 0.3);
        }
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }

  `
};
