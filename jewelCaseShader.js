import * as THREE from './public/vendor/three.module.js';

// Front Lid Plastic Shader (Clear polystyrene with gloss & light reflection)
export const FrontLidShader = {
  uniforms: {
    tCover: { value: null },
    uPlasticGloss: { value: 0.40 },
    uPlasticIridescence: { value: 0.13 },
    uLightPos: { value: new THREE.Vector3(2.5, 4.0, 3.5) },
    uCaseTint: { value: new THREE.Color(0.96, 0.98, 1.0) }
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
      vObjectNormal = normal;
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
    uniform float uPlasticGloss;
    uniform float uPlasticIridescence;
    uniform vec3 uLightPos;
    uniform vec3 uCaseTint;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vObjectNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;

    vec3 spectralColor(float t) {
      return vec3(
        0.5 + 0.5 * cos(6.28318 * (t + 0.0)),
        0.5 + 0.5 * cos(6.28318 * (t + 0.33)),
        0.5 + 0.5 * cos(6.28318 * (t + 0.67))
      );
    }

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPosition);
      vec3 L = normalize(uLightPos - vWorldPosition);
      vec3 H = normalize(L + V);

      bool isFront = vObjectNormal.z > 0.45;
      bool isBack = vObjectNormal.z < -0.45;
      bool isEdge = !isFront && !isBack;

      float NdotV = max(dot(N, V), 0.0);
      float F0 = 0.05;
      float fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 4.5);

      float NdotH = max(dot(N, H), 0.0);
      float specPower = mix(25.0, 140.0, uPlasticGloss);
      float spec = pow(NdotH, specPower);
      float broadSpec = pow(NdotH, 10.0) * 0.25;

      float sheenAngle = dot(N, V) * 1.5 + dot(N, L) * 0.8;
      vec3 iridColor = spectralColor(sheenAngle * 1.8);

      vec3 finalColor = vec3(0.0);

      if (isFront) {
        // Front Cover Album Art with light gloss
        vec4 coverTex = texture2D(tCover, vUv);
        vec3 artColor = coverTex.rgb;

        float borderInset = 0.008;
        bool inBorder = vUv.x < borderInset || vUv.x > (1.0 - borderInset) ||
                        vUv.y < borderInset || vUv.y > (1.0 - borderInset);

        if (inBorder) {
          artColor = mix(coverTex.rgb * 0.5, vec3(0.92, 0.96, 1.0) * 0.25, 0.8);
        }

        vec3 plasticReflection = vec3(1.0) * spec * (uPlasticGloss * 1.1) +
                                iridColor * (fresnel * uPlasticIridescence * 0.8) +
                                vec3(1.0) * broadSpec * 0.2;

        finalColor = artColor * uCaseTint + plasticReflection;
        float streak = smoothstep(0.42, 0.52, sin((vUv.x + vUv.y) * 4.0 + dot(V, vec3(1.0)) * 2.0));
        finalColor += vec3(0.08) * streak * uPlasticGloss * fresnel;

      } else if (isBack) {
        // Inside face of the front lid: Reverse paper booklet (matte paper tone)
        vec4 coverTex = texture2D(tCover, vec2(1.0 - vUv.x, vUv.y));
        // Soft paper texture tint (slight warmth, matte)
        vec3 paperColor = mix(coverTex.rgb * 0.45, vec3(0.92, 0.90, 0.86), 0.55);
        finalColor = paperColor * 0.9;

      } else {
        // Outer clear plastic rim
        vec3 edgePlasticBase = vec3(0.85, 0.89, 0.94);
        float rim = pow(1.0 - NdotV, 2.2);
        finalColor = edgePlasticBase * 0.35 + vec3(1.0) * (spec * 1.5 + rim * 0.5 * uPlasticGloss) + (iridColor * fresnel * 0.25);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
