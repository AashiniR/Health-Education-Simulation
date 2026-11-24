/**
 * Builds the stylized procedural brain.
 *
 * Each cerebral hemisphere starts as a sphere that is pushed into a brain
 * shape. Every triangle is assigned to an anatomical region (prefrontal,
 * rest of frontal, parietal, temporal, occipital) using the major fissures
 * as boundaries. The surface is then carved with noise "sulci" (folds), the
 * region borders are cut deeper (like the lateral and central sulci), and the
 * surface is split into one mesh per region. The cerebellum, brainstem and
 * hippocampus are built separately.
 *
 * Coordinate system: +x = the brain's LEFT side (the side the camera starts
 * on), +y = up, +z = the front (forehead).
 *
 * Part names produced here (use them as region ids in brainContent.ts):
 *   prefrontal-cortex, frontal-lobe, parietal-lobe, temporal-lobe,
 *   occipital-lobe, hippocampus, cerebellum, brainstem
 */
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  LatheGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createNoise3D, smoothstep, type Noise3D } from "./noise";
import { computeAnchors, ensureShaderAttributes, type BrainModel, type BrainPart } from "./model";

export const PROCEDURAL_PART_NAMES = [
  "prefrontal-cortex",
  "frontal-lobe",
  "parietal-lobe",
  "temporal-lobe",
  "occipital-lobe",
  "hippocampus",
  "cerebellum",
  "brainstem",
] as const;

const CORTEX = ["prefrontal-cortex", "frontal-lobe", "parietal-lobe", "temporal-lobe", "occipital-lobe"] as const;
const TEMPORAL = 3;

/** Default camera directions when a part is focused (toward the camera). */
const VIEW_DIRS: Record<string, [number, number, number]> = {
  "prefrontal-cortex": [0.55, 0.3, 1],
  "frontal-lobe": [0.7, 0.75, 0.35],
  "parietal-lobe": [0.6, 0.95, -0.45],
  "temporal-lobe": [1, -0.12, 0.2],
  "occipital-lobe": [0.55, 0.25, -1],
  hippocampus: [1, -0.15, 0.3],
  cerebellum: [0.55, -0.35, -1],
  brainstem: [0.9, -0.3, -0.5],
};

// Hemisphere proportions (half-sizes) and position.
const H = { a: 0.6, b: 0.66, c: 1.0, x0: 0.2, medial: 0.3 };

const DETAIL = 46;
const PICK_DETAIL = 14;

// Icosahedron (same layout as three.js IcosahedronGeometry).
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_V = [-1, PHI, 0, 1, PHI, 0, -1, -PHI, 0, 1, -PHI, 0, 0, -1, PHI, 0, 1, PHI, 0, -1, -PHI, 0, 1, -PHI, PHI, 0, -1, PHI, 0, 1, -PHI, 0, -1, -PHI, 0, 1];
const ICO_F = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
const icoCache = new Map<number, { position: Float32Array; index: Uint32Array }>();

/**
 * Indexed unit icosphere: each icosahedron face split into n*n triangles.
 * Vertices on shared face edges are welded (much faster than mergeVertices).
 */
function icosphere(n: number): { position: Float32Array; index: Uint32Array } {
  const cached = icoCache.get(n);
  if (cached) return cached;
  const pos: number[] = [];
  const shared = new Map<string, number>();
  const idx: number[] = [];
  const grid: number[] = new Array(((n + 1) * (n + 2)) / 2);
  const gi = (i: number, j: number) => (i * (2 * n + 3 - i)) / 2 + j;
  for (let f = 0; f < 20; f++) {
    const a = ICO_F[f * 3] * 3,
      b = ICO_F[f * 3 + 1] * 3,
      c = ICO_F[f * 3 + 2] * 3;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n - i; j++) {
        const u = i / n,
          v = j / n,
          w = 1 - u - v;
        let x = ICO_V[a] * w + ICO_V[b] * u + ICO_V[c] * v;
        let y = ICO_V[a + 1] * w + ICO_V[b + 1] * u + ICO_V[c + 1] * v;
        let z = ICO_V[a + 2] * w + ICO_V[b + 2] * u + ICO_V[c + 2] * v;
        const l = Math.hypot(x, y, z);
        x /= l;
        y /= l;
        z /= l;
        let id: number;
        if (i === 0 || j === 0 || i + j === n) {
          const key = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
          const found = shared.get(key);
          if (found !== undefined) id = found;
          else {
            id = pos.length / 3;
            pos.push(x, y, z);
            shared.set(key, id);
          }
        } else {
          id = pos.length / 3;
          pos.push(x, y, z);
        }
        grid[gi(i, j)] = id;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) {
        idx.push(grid[gi(i, j)], grid[gi(i + 1, j)], grid[gi(i, j + 1)]);
        if (i + j < n - 1) idx.push(grid[gi(i + 1, j)], grid[gi(i + 1, j + 1)], grid[gi(i, j + 1)]);
      }
    }
  }
  const out = { position: new Float32Array(pos), index: new Uint32Array(idx) };
  icoCache.set(n, out);
  return out;
}

function icoIndexed(detail: number): BufferGeometry {
  const s = icosphere(detail);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(s.position.slice(), 3));
  g.setIndex(new BufferAttribute(s.index.slice(), 1));
  return g;
}

/** Pushes a unit-sphere direction into a hemisphere shape. */
function baseShape(dx: number, dy: number, dz: number, side: number, out: Float32Array, o: number) {
  const lat = dx * side; // + = lateral (outer) side, - = medial (middle) side
  const medialBlend = smoothstep(-0.5, 0.12, lat);
  const ax = H.a * (H.medial + (1 - H.medial) * medialBlend);
  const front = smoothstep(0.1, 1, dz);
  const back = smoothstep(0.35, 1, -dz);
  let x = dx * ax * (1 - 0.16 * front - 0.22 * back);
  let y = dy * H.b * (1 - 0.14 * front - 0.12 * back);
  const z = dz * H.c * (1 - 0.04 * Math.max(0, dy));
  if (dy < 0) {
    y *= 0.56;
    // The temporal lobe hangs lower on the outer side, under the lateral fissure.
    const temporal =
      smoothstep(-0.9, -0.3, dz) * (1 - smoothstep(0.28, 0.66, dz)) * smoothstep(-0.05, 0.6, lat);
    const under = smoothstep(0, -0.8, dy);
    y -= 0.19 * temporal * under;
    x += side * 0.05 * temporal * under;
    // Flatter underside of the frontal lobe (above the eyes).
    y *= 1 - 0.25 * smoothstep(0.45, 0.95, dz);
  }
  out[o] = side * H.x0 + x;
  out[o + 1] = y;
  out[o + 2] = z;
}

/** Region index (into CORTEX) for a point on the base (unfolded) shape. */
function classify(y: number, z: number): number {
  if (z < -0.7 + 0.12 * y) return 4; // occipital: behind the parieto-occipital line
  const sylvian = Math.min(0.15, -0.07 + 0.34 * Math.max(0, 0.38 - z));
  if (y < sylvian && z < 0.52) return TEMPORAL; // below the lateral (Sylvian) fissure
  const central = 0.24 * (0.6 - y); // central sulcus, slanting forward as it goes down
  if (z > central) return z > 0.37 + 0.05 * y ? 0 : 1; // prefrontal vs rest of frontal
  return 2; // parietal
}

function foldField(noise: Noise3D, x: number, y: number, z: number, side: number): number {
  const ox = side * 7.3;
  const wx = noise(x * 1.25 + 11.1 + ox, y * 1.25, z * 1.25);
  const wy = noise(x * 1.25 + ox, y * 1.25 + 23.7, z * 1.25);
  const wz = noise(x * 1.25 + ox, y * 1.25, z * 1.25 + 37.3);
  const f = 3.1;
  const qx = x * f + wx * 0.7 + ox;
  const qy = y * f + wy * 0.7;
  const qz = z * f + wz * 0.7;
  const v = noise(qx, qy, qz) + 0.12 * noise(qx * 2.3 + 5.1, qy * 2.3, qz * 2.3);
  return 1 - smoothstep(0, 0.24, Math.abs(v));
}

interface Surface {
  position: Float32Array;
  normal: Float32Array;
  smoothN: Float32Array;
  fold: Float32Array;
  index: Uint32Array;
  triRegion: Uint8Array;
  vertexCount: number;
}

function computeNormals(position: Float32Array, index: Uint32Array): Float32Array {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(position, 3));
  g.setIndex(new BufferAttribute(index, 1));
  g.computeVertexNormals();
  const n = g.getAttribute("normal").array as Float32Array;
  g.dispose();
  return n;
}

function buildHemisphere(side: number, detail: number, noise: Noise3D | null): Surface {
  const ico = icosphere(detail);
  const src = ico.position;
  const vertexCount = src.length / 3;
  const index = ico.index;

  const base = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    baseShape(src[i * 3], src[i * 3 + 1], src[i * 3 + 2], side, base, i * 3);
  }

  const triCount = index.length / 3;
  const triRegion = new Uint8Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const a = index[t * 3] * 3,
      b = index[t * 3 + 1] * 3,
      c = index[t * 3 + 2] * 3;
    const cy = (base[a + 1] + base[b + 1] + base[c + 1]) / 3;
    const cz = (base[a + 2] + base[b + 2] + base[c + 2]) / 3;
    triRegion[t] = classify(cy, cz);
  }

  const smoothN = computeNormals(base, index);
  if (!noise) {
    return { position: base, normal: smoothN, smoothN, fold: new Float32Array(vertexCount), index, triRegion, vertexCount };
  }

  // Region borders: vertices touching triangles of different regions.
  const mask = new Uint8Array(vertexCount);
  for (let t = 0; t < triCount; t++) {
    const bit = 1 << triRegion[t];
    mask[index[t * 3]] |= bit;
    mask[index[t * 3 + 1]] |= bit;
    mask[index[t * 3 + 2]] |= bit;
  }
  // Vertex adjacency (CSR) for spreading the border grooves a couple of rings.
  const deg = new Uint32Array(vertexCount + 1);
  for (let i = 0; i < index.length; i++) deg[index[i] + 1] += 2;
  for (let i = 0; i < vertexCount; i++) deg[i + 1] += deg[i];
  const adj = new Uint32Array(deg[vertexCount]);
  const fill = deg.slice(0, vertexCount);
  for (let t = 0; t < triCount; t++) {
    const a = index[t * 3],
      b = index[t * 3 + 1],
      c = index[t * 3 + 2];
    adj[fill[a]++] = b;
    adj[fill[a]++] = c;
    adj[fill[b]++] = a;
    adj[fill[b]++] = c;
    adj[fill[c]++] = a;
    adj[fill[c]++] = b;
  }
  const RING_WEIGHT = [1, 0.62, 0.26];
  const groove = new Float32Array(vertexCount);
  const deep = new Uint8Array(vertexCount);
  let frontier: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const m = mask[i];
    if (m & (m - 1)) {
      groove[i] = RING_WEIGHT[0];
      deep[i] = m & (1 << TEMPORAL) ? 1 : 0;
      frontier.push(i);
    }
  }
  for (let ring = 1; ring < RING_WEIGHT.length; ring++) {
    const next: number[] = [];
    for (const v of frontier) {
      for (let k = deg[v]; k < deg[v + 1]; k++) {
        const u = adj[k];
        if (groove[u] < RING_WEIGHT[ring]) {
          groove[u] = RING_WEIGHT[ring];
          deep[u] = deep[v];
          next.push(u);
        }
      }
    }
    frontier = next;
  }

  const position = new Float32Array(vertexCount * 3);
  const fold = new Float32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const o = i * 3;
    const x = base[o],
      y = base[o + 1],
      z = base[o + 2];
    const lat = (x - side * H.x0) * side;
    const foldScale = 0.45 + 0.55 * smoothstep(-0.12, 0.05, lat); // fewer folds on the flat middle wall
    const f = foldField(noise, x, y, z, side) * foldScale;
    const g = groove[i];
    const d = -0.045 * f + 0.008 * (1 - f) - g * (deep[i] ? 0.085 : 0.05);
    position[o] = x + smoothN[o] * d;
    position[o + 1] = y + smoothN[o + 1] * d;
    position[o + 2] = z + smoothN[o + 2] * d;
    fold[i] = Math.min(1, f * 0.85 + g * 0.9);
  }
  const normal = computeNormals(position, index);
  return { position, normal, smoothN, fold, index, triRegion, vertexCount };
}

type AttrSet = { name: string; array: Float32Array; size: number }[];

/** Copies a subset of triangles (with only the vertices they use) into a new geometry. */
function extract(attrs: AttrSet, vertexCount: number, index: Uint32Array, tris: number[]): BufferGeometry {
  const remap = new Int32Array(vertexCount).fill(-1);
  let used = 0;
  const newIndex = new Uint32Array(tris.length * 3);
  for (let i = 0; i < tris.length; i++) {
    for (let k = 0; k < 3; k++) {
      const v = index[tris[i] * 3 + k];
      if (remap[v] < 0) remap[v] = used++;
      newIndex[i * 3 + k] = remap[v];
    }
  }
  const g = new BufferGeometry();
  for (const a of attrs) {
    const out = new Float32Array(used * a.size);
    for (let v = 0; v < vertexCount; v++) {
      const r = remap[v];
      if (r < 0) continue;
      for (let c = 0; c < a.size; c++) out[r * a.size + c] = a.array[v * a.size + c];
    }
    g.setAttribute(a.name, new BufferAttribute(out, a.size));
  }
  g.setIndex(new BufferAttribute(newIndex, 1));
  return g;
}

function mergeGeometries2(a: BufferGeometry, b: BufferGeometry): BufferGeometry {
  const out = new BufferGeometry();
  const ca = a.getAttribute("position").count;
  for (const name of Object.keys(a.attributes)) {
    const aa = a.getAttribute(name);
    const bb = b.getAttribute(name);
    const arr = new Float32Array(aa.array.length + bb.array.length);
    arr.set(aa.array as Float32Array, 0);
    arr.set(bb.array as Float32Array, aa.array.length);
    out.setAttribute(name, new BufferAttribute(arr, aa.itemSize));
  }
  const ia = a.getIndex()!.array,
    ib = b.getIndex()!.array;
  const idx = new Uint32Array(ia.length + ib.length);
  idx.set(ia as Uint32Array, 0);
  for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + ca;
  out.setIndex(new BufferAttribute(idx, 1));
  return out;
}

function cortexParts(noise: Noise3D): Map<string, { geometry: BufferGeometry; pick: BufferGeometry }> {
  const result = new Map<string, { geometry: BufferGeometry; pick: BufferGeometry }>();
  const sides = [1, -1].map((side) => ({
    full: buildHemisphere(side, DETAIL, noise),
    pick: buildHemisphere(side, PICK_DETAIL, null),
  }));
  CORTEX.forEach((name, r) => {
    let geometry: BufferGeometry | null = null;
    let pick: BufferGeometry | null = null;
    for (const s of sides) {
      const trisFull: number[] = [];
      s.full.triRegion.forEach((reg, t) => reg === r && trisFull.push(t));
      const trisPick: number[] = [];
      s.pick.triRegion.forEach((reg, t) => reg === r && trisPick.push(t));
      const g = extract(
        [
          { name: "position", array: s.full.position, size: 3 },
          { name: "normal", array: s.full.normal, size: 3 },
          { name: "aSmoothN", array: s.full.smoothN, size: 3 },
          { name: "aFold", array: s.full.fold, size: 1 },
        ],
        s.full.vertexCount,
        s.full.index,
        trisFull,
      );
      const p = extract([{ name: "position", array: s.pick.position, size: 3 }], s.pick.vertexCount, s.pick.index, trisPick);
      geometry = geometry ? mergeGeometries2(geometry, g) : g;
      pick = pick ? mergeGeometries2(pick, p) : p;
    }
    result.set(name, { geometry: geometry!, pick: pick! });
  });
  return result;
}

function finishSurface(g: BufferGeometry, displace?: (p: Vector3, n: Vector3, out: { d: number; fold: number }) => void) {
  g.computeVertexNormals();
  const pos = g.getAttribute("position");
  const nrm = g.getAttribute("normal");
  g.setAttribute("aSmoothN", new BufferAttribute(new Float32Array(nrm.array as Float32Array), 3));
  const fold = new Float32Array(pos.count);
  if (displace) {
    const p = new Vector3(),
      n = new Vector3(),
      res = { d: 0, fold: 0 };
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nrm, i);
      displace(p, n, res);
      pos.setXYZ(i, p.x + n.x * res.d, p.y + n.y * res.d, p.z + n.z * res.d);
      fold[i] = res.fold;
    }
    g.computeVertexNormals();
  }
  g.setAttribute("aFold", new BufferAttribute(fold, 1));
  return g;
}

function buildCerebellum(noise: Noise3D, detail: number, folia: boolean): BufferGeometry {
  const g = icoIndexed(detail);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i),
      dy = pos.getY(i),
      dz = pos.getZ(i);
    const notch = Math.exp(-(dx * dx) / 0.01);
    const x = dx * 0.58;
    const y = dy * 0.25 * (1 - 0.15 * notch);
    const z = dz * 0.34 + 0.05 * notch * smoothstep(0, -0.6, dz);
    pos.setXYZ(i, x, y - 0.55, z - 0.56);
  }
  if (!folia) {
    g.computeVertexNormals();
    return g;
  }
  return finishSurface(g, (p, _n, out) => {
    const theta = Math.atan2(p.y + 0.55, -(p.z + 0.56));
    const s = Math.sin(theta * 24 + noise(p.x * 4, p.y * 4, p.z * 4) * 1.4);
    const ridge = 1 - smoothstep(0, 0.4, Math.abs(s));
    out.d = -0.022 * ridge;
    out.fold = ridge * 0.8;
  });
}

function buildBrainstem(segments: number): BufferGeometry {
  const profile = [
    [0.001, -1.12],
    [0.085, -1.1],
    [0.1, -0.95],
    [0.115, -0.75],
    [0.15, -0.6],
    [0.175, -0.5],
    [0.155, -0.38],
    [0.14, -0.25],
    [0.1, -0.14],
    [0.001, -0.1],
  ].map(([r, y]) => new Vector2(r, y));
  const lathe = new LatheGeometry(profile, segments);
  lathe.deleteAttribute("uv");
  lathe.deleteAttribute("normal");
  const g = mergeVertices(lathe, 1e-5);
  lathe.dispose();
  const pos = g.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Pons bulges forward.
    if (v.z > 0) v.z *= 1 + 0.4 * Math.exp(-(((v.y + 0.5) / 0.12) ** 2));
    v.z *= 0.85;
    // Tilt so the bottom points slightly back, then move under the brain.
    const c = Math.cos(0.22),
      s = Math.sin(0.22);
    const y = v.y * c - v.z * s;
    const z = v.y * s + v.z * c;
    pos.setXYZ(i, v.x, y, z - 0.2);
  }
  g.computeVertexNormals();
  return g;
}

function buildHippocampus(side: number, seg: number, radial: number): BufferGeometry {
  const pts = [
    [0.33, -0.31, 0.23],
    [0.36, -0.3, 0.08],
    [0.345, -0.26, -0.1],
    [0.3, -0.19, -0.26],
    [0.23, -0.08, -0.35],
    [0.16, 0.0, -0.32],
  ].map(([x, y, z]) => new Vector3(x * side, y, z));
  const curve = new CatmullRomCurve3(pts, false, "catmullrom", 0.5);
  const frames = curve.computeFrenetFrames(seg, false);
  const positions = new Float32Array((seg + 1) * radial * 3);
  const p = new Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    curve.getPointAt(t, p);
    const taper =
      Math.sin((Math.min(1, t / 0.08) * Math.PI) / 2) * Math.sin((Math.min(1, (1 - t) / 0.06) * Math.PI) / 2);
    const r0 = Math.max(0.003, 0.068 * (1 - 0.6 * t) * taper);
    const N = frames.normals[i],
      B = frames.binormals[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      // The head (front) has small finger-like bumps, like a seahorse.
      const r = r0 * (1 + 0.14 * Math.sin(a * 4) * Math.max(0, 1 - t / 0.3));
      const o = (i * radial + j) * 3;
      positions[o] = p.x + (N.x * Math.cos(a) + B.x * Math.sin(a) * 0.72) * r;
      positions[o + 1] = p.y + (N.y * Math.cos(a) + B.y * Math.sin(a) * 0.72) * r;
      positions[o + 2] = p.z + (N.z * Math.cos(a) + B.z * Math.sin(a) * 0.72) * r;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      if (side > 0) index.push(a, c, b, b, c, d);
      else index.push(a, b, c, b, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function bilateral(build: (side: number) => BufferGeometry): BufferGeometry {
  return mergeGeometries2(build(1), build(-1));
}

/** Builds the full procedural brain. Takes roughly 50–200 ms depending on the device. */
export function buildProceduralBrain(): BrainModel {
  const noise = createNoise3D(7);
  const center = new Vector3(0, -0.08, 0);
  const raw = new Map<string, { geometry: BufferGeometry; pick: BufferGeometry }>(cortexParts(noise));

  raw.set("cerebellum", {
    geometry: buildCerebellum(noise, 22, true),
    pick: buildCerebellum(noise, 6, false),
  });
  raw.set("brainstem", {
    geometry: finishSurface(buildBrainstem(28)),
    pick: buildBrainstem(10),
  });
  const hippo = bilateral((s) => buildHippocampus(s, 64, 14));
  raw.set("hippocampus", {
    geometry: finishSurface(hippo),
    pick: bilateral((s) => buildHippocampus(s, 24, 8)),
  });

  const parts: BrainPart[] = [];
  for (const name of PROCEDURAL_PART_NAMES) {
    const r = raw.get(name);
    if (!r) continue;
    const geometry = ensureShaderAttributes(r.geometry);
    r.pick.computeBoundingSphere();
    const dir = VIEW_DIRS[name] ? new Vector3(...VIEW_DIRS[name]) : undefined;
    const { anchor, surfacePoint, viewDir } = computeAnchors(geometry, center, dir);
    parts.push({ name, geometry, pickGeometry: r.pick, anchor, surfacePoint, viewDir });
  }
  return { parts, center, radius: 1.04, source: "procedural" };
}
