"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, Mesh, MeshBasicMaterial, Vector3, type BufferGeometry } from "three";
import { REGIONS, isNetwork, meshKeysFor, warnOnce } from "@/lib/content";
import { useApp } from "@/lib/store";
import type { BrainModel } from "./model";
import { NetworkLines } from "./NetworkLines";
import { RegionMesh } from "./RegionMesh";
import { registry, type RegionAnchor } from "./registry";

const pickMaterial = new MeshBasicMaterial({ visible: false, side: DoubleSide });

interface Mapped {
  meshes: { key: string; geometry: BufferGeometry; regionId: string | null }[];
  pickables: Mesh[];
  anchors: Map<string, RegionAnchor>;
  nodes: Map<string, Vector3>;
  available: string[];
}

/**
 * Connects the regions in brainContent.ts to the parts of the 3D model.
 * Regions without a matching part are skipped with a console warning.
 * Parts no region claims become neutral (dim blue, not selectable) tissue.
 */
function mapModel(model: BrainModel): Mapped {
  const used = new Set<string>();
  const out: Mapped = { meshes: [], pickables: [], anchors: new Map(), nodes: new Map(), available: [] };

  for (const r of REGIONS) {
    if (isNetwork(r)) continue;
    const keys = meshKeysFor(r);
    const parts = model.parts.filter((p) => keys.includes(p.name) && !used.has(p.name));
    if (!parts.length) {
      warnOnce(
        `Region "${r.id}" has no matching 3D shape (looked for: ${keys.join(", ")}). It still appears in the list and tour, but won't light up on the 3D brain.`,
      );
      continue;
    }
    const target = new Vector3();
    const surface = new Vector3();
    parts.forEach((p, i) => {
      out.meshes.push({ key: `${p.name}-${i}`, geometry: p.geometry, regionId: r.id });
      const pick = new Mesh(p.pickGeometry, pickMaterial);
      pick.userData = { regionId: r.id, deep: !!r.deep };
      out.pickables.push(pick);
      target.add(p.anchor);
      surface.add(p.surfacePoint);
    });
    parts.forEach((p) => used.add(p.name));
    target.divideScalar(parts.length);
    surface.divideScalar(parts.length);
    const dir = r.view?.direction ? new Vector3(...r.view.direction).normalize() : parts[0].viewDir.clone();
    out.anchors.set(r.id, { target, dir, distance: r.view?.distance ?? 0 });
    // Network lines attach just under the surface, so they run through the see-through brain.
    out.nodes.set(r.id, r.deep ? target.clone() : target.clone().lerp(surface, 0.8));
    out.available.push(r.id);
  }

  model.parts.forEach((p, i) => {
    if (used.has(p.name)) return;
    out.meshes.push({ key: `ctx-${p.name}-${i}`, geometry: p.geometry, regionId: null });
    const pick = new Mesh(p.pickGeometry, pickMaterial);
    pick.userData = { regionId: null, deep: false };
    out.pickables.push(pick);
  });

  for (const net of REGIONS.filter(isNetwork)) {
    const ok = (net.links ?? []).some(([a, b]) => out.nodes.has(a) && out.nodes.has(b));
    if (ok) out.available.push(net.id);
    else warnOnce(`Network "${net.id}" has no links between regions on the 3D brain, so no lines are drawn.`);
  }
  return out;
}

export function BrainScene({ model }: { model: BrainModel }) {
  const mapped = useMemo(() => mapModel(model), [model]);

  useEffect(() => {
    registry.center.copy(model.center);
    registry.radius = model.radius;
    registry.anchors.clear();
    mapped.anchors.forEach((v, k) => registry.anchors.set(k, v));
    mapped.pickables.forEach((p) => registry.pickables.add(p));
    const app = useApp.getState();
    app.setPickable(mapped.available);
    app.setBrainReady(true);
    return () => {
      mapped.pickables.forEach((p) => registry.pickables.delete(p));
      useApp.getState().setBrainReady(false);
    };
  }, [mapped, model]);

  return (
    <group>
      {mapped.meshes.map((m) => (
        <RegionMesh key={m.key} geometry={m.geometry} regionId={m.regionId} />
      ))}
      <NetworkLines nodes={mapped.nodes} center={model.center} />
    </group>
  );
}
