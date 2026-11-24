/**
 * Plain (non-React) data shared between 3D components: where each region is,
 * and which invisible meshes the pointer can pick.
 */
import { Object3D, Vector3 } from "three";

export interface RegionAnchor {
  /** Point the camera looks at. */
  target: Vector3;
  /** Direction from the target toward the camera. */
  dir: Vector3;
  /** Camera distance when focused; 0 = automatic (a bit closer than the whole-brain view). */
  distance: number;
}

export const registry = {
  anchors: new Map<string, RegionAnchor>(),
  /** Network line end points per region id. */
  nodes: new Map<string, Vector3>(),
  pickables: new Set<Object3D>(),
  center: new Vector3(0, -0.08, 0),
  radius: 1.12,
  /** How far (px) the brain is shifted on screen to stay centered between panels. +y = down. */
  viewShift: { x: 0, y: 0 },
};

/** Camera direction for the home view (front-left, slightly above). */
export const HOME_DIR = new Vector3(0.82, 0.34, 0.6).normalize();
