"use client";

/**
 * OPTIONAL: loads a real segmented brain model from /public/models/brain.glb.
 *
 * How it works:
 *  - Set `model.file` to "/models/brain.glb" in src/data/brainContent.ts.
 *  - Every mesh in the file is a "part". Its name (lowercased, spaces and
 *    underscores turned into dashes) is matched against each region's `id`
 *    or `meshNames` in brainContent.ts. Example: a mesh named "Temporal_Lobe"
 *    becomes "temporal-lobe" and lights up the Temporal Lobe region.
 *  - Meshes that no region claims are drawn as neutral blue tissue.
 *  - The model is automatically centered and scaled to the same size as the
 *    built-in brain. Use `model.rotationDegrees` if it faces the wrong way
 *    (the front of the brain should point toward +z, the top toward +y).
 *  - If the file is missing or broken, the built-in brain is used instead and
 *    a warning appears in the browser console.
 */
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, BufferGeometry, Euler, Matrix4, Mesh, Sphere, Vector3, type Object3D } from "three";
import { MODEL_CONFIG, normalizeMeshName } from "@/lib/content";
import { computeAnchors, ensureShaderAttributes, type BrainModel, type BrainPart } from "./model";
import { BrainScene } from "./BrainScene";

const TARGET_LENGTH = 2.0; // same front-to-back length as the procedural brain

function modelFromScene(root: Object3D): BrainModel {
  root.updateMatrixWorld(true);
  const [rx, ry, rz] = MODEL_CONFIG.rotationDegrees.map((d) => (d * Math.PI) / 180);
  const rot = new Matrix4().makeRotationFromEuler(new Euler(rx, ry, rz));
  const raw: { name: string; geometry: BufferGeometry }[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = new BufferGeometry();
    const src = m.geometry;
    g.setAttribute("position", src.getAttribute("position").clone());
    if (src.getAttribute("normal")) g.setAttribute("normal", src.getAttribute("normal").clone());
    if (src.getIndex()) g.setIndex(src.getIndex()!.clone());
    g.applyMatrix4(m.matrixWorld);
    g.applyMatrix4(rot);
    raw.push({ name: normalizeMeshName(m.name || m.parent?.name || "part"), geometry: g });
  });
  if (!raw.length) throw new Error("brain.glb contains no meshes");

  const box = new Box3();
  raw.forEach((r) => {
    r.geometry.computeBoundingBox();
    box.union(r.geometry.boundingBox!);
  });
  const c = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const scale = TARGET_LENGTH / Math.max(size.x, size.y, size.z, 1e-6);
  const fit = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-c.x, -c.y, -c.z));

  const center = new Vector3();
  const sphere = new Sphere();
  const all = new Box3();
  const parts: BrainPart[] = raw.map(({ name, geometry }) => {
    geometry.applyMatrix4(fit);
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    ensureShaderAttributes(geometry);
    geometry.computeBoundingBox();
    all.union(geometry.boundingBox!);
    const pickGeometry = new BufferGeometry();
    pickGeometry.setAttribute("position", geometry.getAttribute("position"));
    if (geometry.getIndex()) pickGeometry.setIndex(geometry.getIndex());
    pickGeometry.computeBoundingSphere();
    const a = computeAnchors(geometry, center);
    return { name, geometry, pickGeometry, ...a };
  });
  all.getBoundingSphere(sphere);
  return { parts, center, radius: Math.max(0.5, sphere.radius * 0.95), source: "glb" };
}

export function GlbBrain({ file }: { file: string }) {
  const gltf = useGLTF(file);
  const model = useMemo(() => modelFromScene(gltf.scene), [gltf.scene]);
  return <BrainScene model={model} />;
}

