/** Moves brain models between a Web Worker and the page as plain typed arrays. */
import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import type { BrainModel } from "./model";

export interface SerializedGeometry {
  attributes: Record<string, { array: Float32Array; itemSize: number }>;
  index: Uint32Array | null;
}

export interface SerializedPart {
  name: string;
  geometry: SerializedGeometry;
  pickGeometry: SerializedGeometry;
  anchor: number[];
  surfacePoint: number[];
  viewDir: number[];
}

export interface SerializedModel {
  parts: SerializedPart[];
  center: number[];
  radius: number;
}

function serializeGeometry(g: BufferGeometry, transfer: ArrayBuffer[]): SerializedGeometry {
  const attributes: SerializedGeometry["attributes"] = {};
  for (const [name, attr] of Object.entries(g.attributes)) {
    const array = attr.array as Float32Array;
    attributes[name] = { array, itemSize: attr.itemSize };
    transfer.push(array.buffer as ArrayBuffer);
  }
  const idx = g.getIndex();
  const index = idx ? new Uint32Array(idx.array as ArrayLike<number>) : null;
  if (index) transfer.push(index.buffer as ArrayBuffer);
  return { attributes, index };
}

export function serializeModel(m: BrainModel): { data: SerializedModel; transfer: ArrayBuffer[] } {
  const transfer: ArrayBuffer[] = [];
  const parts = m.parts.map((p) => ({
    name: p.name,
    geometry: serializeGeometry(p.geometry, transfer),
    pickGeometry: serializeGeometry(p.pickGeometry, transfer),
    anchor: p.anchor.toArray(),
    surfacePoint: p.surfacePoint.toArray(),
    viewDir: p.viewDir.toArray(),
  }));
  return { data: { parts, center: m.center.toArray(), radius: m.radius }, transfer };
}

function deserializeGeometry(s: SerializedGeometry): BufferGeometry {
  const g = new BufferGeometry();
  for (const [name, a] of Object.entries(s.attributes)) g.setAttribute(name, new BufferAttribute(a.array, a.itemSize));
  if (s.index) g.setIndex(new BufferAttribute(s.index, 1));
  g.computeBoundingSphere();
  return g;
}

export function deserializeModel(d: SerializedModel): BrainModel {
  return {
    source: "procedural",
    center: new Vector3().fromArray(d.center),
    radius: d.radius,
    parts: d.parts.map((p) => ({
      name: p.name,
      geometry: deserializeGeometry(p.geometry),
      pickGeometry: deserializeGeometry(p.pickGeometry),
      anchor: new Vector3().fromArray(p.anchor),
      surfacePoint: new Vector3().fromArray(p.surfacePoint),
      viewDir: new Vector3().fromArray(p.viewDir),
    })),
  };
}
