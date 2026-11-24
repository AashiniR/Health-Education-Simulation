/**
 * Shared types and helpers for brain models (the built-in procedural brain
 * and an optional real model loaded from /public/models/brain.glb).
 *
 * A brain model is just a list of named parts. Each region in
 * src/data/brainContent.ts finds its part(s) by name (its `id`, or its
 * `meshNames`). Parts that no region claims are drawn as neutral tissue.
 */
import { BufferAttribute, BufferGeometry, Vector3 } from "three";

export interface BrainPart {
  /** Normalized name (lowercase-with-dashes), matched against region ids. */
  name: string;
  /** Render geometry: position, normal, aFold (0..1 groove amount), aSmoothN. */
  geometry: BufferGeometry;
  /** Lower-detail geometry used for pointer picking. */
  pickGeometry: BufferGeometry;
  /** Center of the part on the viewer-facing (+x, left) side. Camera target when focused. */
  anchor: Vector3;
  /** A point on the outer surface, used as an end point for network lines. */
  surfacePoint: Vector3;
  /** Direction from the part toward the camera when focused. */
  viewDir: Vector3;
}

export interface BrainModel {
  parts: BrainPart[];
  center: Vector3;
  radius: number;
  source: "procedural" | "glb";
}

/** Adds the extra attributes the brain shader expects, if missing. */
export function ensureShaderAttributes(g: BufferGeometry): BufferGeometry {
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const count = g.getAttribute("position").count;
  if (!g.getAttribute("aFold")) g.setAttribute("aFold", new BufferAttribute(new Float32Array(count), 1));
  if (!g.getAttribute("aSmoothN")) {
    const n = g.getAttribute("normal");
    g.setAttribute("aSmoothN", new BufferAttribute(new Float32Array(n.array as ArrayLike<number>), 3));
  }
  g.computeBoundingSphere();
  return g;
}

/**
 * Computes the focus anchor (centroid of the +x side), a surface point that
 * faces `viewDir`, and a default view direction (outward from the brain center).
 */
export function computeAnchors(
  g: BufferGeometry,
  center: Vector3,
  viewDir?: Vector3,
): { anchor: Vector3; surfacePoint: Vector3; viewDir: Vector3 } {
  const pos = g.getAttribute("position");
  const anchor = new Vector3();
  let n = 0;
  const pass = (onlyLeft: boolean) => {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      if (onlyLeft && x < center.x + 0.02) continue;
      anchor.x += x;
      anchor.y += pos.getY(i);
      anchor.z += pos.getZ(i);
      n++;
    }
  };
  pass(true);
  if (n < 10) {
    anchor.set(0, 0, 0);
    n = 0;
    pass(false);
  }
  anchor.divideScalar(Math.max(1, n));

  const dir = viewDir?.clone().normalize() ?? anchor.clone().sub(center);
  if (dir.lengthSq() < 1e-6) dir.set(0.8, 0.3, 0.5);
  dir.normalize();

  // Surface point: the vertex (left side preferred) furthest along `dir`.
  const surfacePoint = anchor.clone();
  let best = -Infinity;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    if (n >= 10 && v.x < center.x + 0.02) continue;
    const d = v.clone().sub(anchor).dot(dir) - 0.35 * v.distanceTo(anchor);
    if (d > best) {
      best = d;
      surfacePoint.copy(v);
    }
  }
  return { anchor, surfacePoint, viewDir: dir };
}
