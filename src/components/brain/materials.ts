/**
 * Holographic "X-ray" brain shader: translucent deep-blue body, bright
 * fresnel rim, glowing fold lines, and a soft shimmer that scales with the
 * region's activity level. Uses additive blending so overlapping layers glow
 * like a medical visualization (and no sorting is needed).
 */
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, ShaderMaterial, Texture, Vector2 } from "three";

export const BRAIN_COLORS = {
  body: "#0a2a78",
  rim: "#3f9dff",
  neutral: "#3f9dff",
  line: "#4f8dff",
};

const vertex = /* glsl */ `
  attribute float aFold;
  attribute vec3 aSmoothN;
  uniform float uInflate;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  varying float vFold;
  void main() {
    vec3 p = position + aSmoothN * uInflate;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    vP = position;
    vFold = aFold;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uRim;
  uniform vec3 uColor;
  uniform float uMix;
  uniform float uBright;
  uniform float uAct;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  varying float vFold;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    float facing = abs(dot(n, v));
    float fres = pow(1.0 - facing, 3.0);
    // Soft "head-lamp" light so the folds read as 3D.
    float light = max(dot(n, normalize(vec3(0.35, 0.75, 0.55))), 0.0);
    float sulcus = smoothstep(0.35, 1.0, vFold);

    // Slow travelling bands + tiny sparks = "neural activity".
    float wave = 0.5 + 0.5 * sin(uTime * 1.6 + vP.y * 7.0 + vP.z * 4.0 + vP.x * 3.0);
    float spark = pow(0.5 + 0.5 * sin(dot(vP, vec3(37.0, 29.0, 23.0)) + uTime * 2.2), 28.0);
    float act = uAct;

    // Neutral holographic blue. Each layer is kept faint because layers add up.
    vec3 blue = uBody * (0.10 + 0.10 * light)
              + uRim * fres * (0.16 + 0.16 * act)
              + uRim * sulcus * (0.025 + 0.085 * act) * (0.6 + 0.4 * wave)
              + uRim * spark * act * 0.12;
    blue *= 0.45 + 0.55 * act;

    // Highlighted: the region's own color, bright but not blown out to white.
    vec3 lit = uColor * (0.055 + 0.04 * light + 0.17 * fres + 0.06 * sulcus * (0.6 + 0.4 * wave))
             * (0.55 + 0.45 * act);

    vec3 col = mix(blue, lit, uMix) * uBright;
    if (!gl_FrontFacing) col *= 0.26;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBright;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    float facing = abs(dot(n, v));
    float g = pow(1.0 - facing, 3.0) * smoothstep(0.0, 0.25, facing + 0.05);
    gl_FragColor = vec4(uColor * g * uBright * 0.25, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface RegionUniforms {
  uBody: { value: Color };
  uRim: { value: Color };
  uColor: { value: Color };
  uMix: { value: number };
  uBright: { value: number };
  uAct: { value: number };
  uTime: { value: number };
  uInflate: { value: number };
}

export function createRegionMaterial(color: string): ShaderMaterial {
  const uniforms: RegionUniforms = {
    uBody: { value: new Color(BRAIN_COLORS.body) },
    uRim: { value: new Color(BRAIN_COLORS.rim) },
    uColor: { value: new Color(color) },
    uMix: { value: 0 },
    uBright: { value: 1 },
    uAct: { value: 1 },
    uTime: { value: 0 },
    uInflate: { value: 0 },
  };
  return new ShaderMaterial({
    uniforms: uniforms as unknown as ShaderMaterial["uniforms"],
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

/** A slightly inflated copy of a region that adds a soft bloom-like glow. */
export function createHaloMaterial(color: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uBright: { value: 0 },
      uInflate: { value: 0.035 },
    },
    vertexShader: vertex,
    fragmentShader: haloFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

let glowTexture: Texture | null = null;

/** Soft round glow sprite texture (generated once, no image file needed). */
export function getGlowTexture(): Texture {
  if (glowTexture) return glowTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.85)");
  g.addColorStop(0.45, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new CanvasTexture(canvas);
  return glowTexture;
}

/** Full-screen radial blue glow drawn behind the brain. */
export function createBackdropMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uCenter: { value: new Vector2(0.5, 0.5) }, uAspect: { value: 1 }, uStrength: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 0.9999, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uCenter;
      uniform float uAspect;
      uniform float uStrength;
      varying vec2 vUv;
      void main() {
        vec2 d = vUv - uCenter;
        d.x *= uAspect;
        float r = length(d);
        float glow = exp(-r * r * 5.0) * 0.55 + exp(-r * r * 26.0) * 0.35;
        vec3 col = vec3(0.02, 0.09, 0.28) * glow * uStrength;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    transparent: true,
  });
}
