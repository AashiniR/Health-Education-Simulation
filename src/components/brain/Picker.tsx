"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Raycaster, Vector2, type Intersection } from "three";
import { pickingEnabled, useApp } from "@/lib/store";
import { hoverPointer } from "@/lib/pointer";
import { registry } from "./registry";

const TAP_MAX_MOVE = 8; // px
const TAP_MAX_MS = 700;

/**
 * Pointer picking against low-detail invisible copies of each region.
 * - Mouse hover highlights a region (throttled to ~30 fps).
 * - A click / tap (press + release without dragging) selects it.
 * - Deep regions (like the hippocampus) win when the pointer is over them,
 *   so they can be picked "through" the see-through outer brain.
 */
export function Picker() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const state = useRef({
    ndc: new Vector2(),
    dirty: false,
    inside: false,
    down: null as null | { x: number; y: number; t: number; id: number },
    dragging: false,
    frame: 0,
  });
  const raycaster = useRef(new Raycaster());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pick = (ndc: Vector2): string | null => {
    const rc = raycaster.current;
    rc.setFromCamera(ndc, camera);
    const hits: Intersection[] = rc.intersectObjects(Array.from(registry.pickables), false);
    if (!hits.length) return null;
    const deep = hits.find((h) => h.object.userData.deep);
    if (deep) return deep.object.userData.regionId as string;
    return (hits[0].object.userData.regionId as string | null) ?? null;
  };

  useEffect(() => {
    const el = gl.domElement;
    canvasRef.current = el;
    const s = state.current;
    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      s.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const onMove = (e: PointerEvent) => {
      hoverPointer.x = e.clientX;
      hoverPointer.y = e.clientY;
      if (s.down && Math.hypot(e.clientX - s.down.x, e.clientY - s.down.y) > TAP_MAX_MOVE) s.dragging = true;
      if (e.pointerType === "touch") return; // no hover on touch screens
      toNdc(e);
      s.inside = true;
      s.dirty = true;
    };
    const onLeave = () => {
      s.inside = false;
      useApp.getState().setHovered(null);
      el.style.cursor = "";
    };
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) {
        s.down = null; // pinch: not a tap
        return;
      }
      s.down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      s.dragging = false;
    };
    const onUp = (e: PointerEvent) => {
      const d = s.down;
      s.down = null;
      const wasDrag = s.dragging;
      s.dragging = false;
      if (!d || d.id !== e.pointerId || wasDrag) return;
      if (performance.now() - d.t > TAP_MAX_MS) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_MAX_MOVE) return;
      const app = useApp.getState();
      if (!pickingEnabled(app)) return;
      toNdc(e);
      const id = pick(s.ndc);
      if (id) app.pickRegion(id);
      if (e.pointerType === "touch") app.setHovered(null);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera]);

  useFrame(() => {
    const s = state.current;
    s.frame++;
    const app = useApp.getState();
    const canvas = canvasRef.current;
    if (!pickingEnabled(app)) {
      if (app.hoveredId) app.setHovered(null);
      if (canvas) canvas.style.cursor = "";
      return;
    }
    if (!s.dirty || !s.inside || s.dragging || s.down || s.frame % 2) return;
    s.dirty = false;
    const id = pick(s.ndc);
    app.setHovered(id);
    if (canvas) canvas.style.cursor = id ? "pointer" : "grab";
  });

  return null;
}
