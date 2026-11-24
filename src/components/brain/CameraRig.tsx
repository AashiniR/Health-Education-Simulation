"use client";

import { TrackballControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef } from "react";
import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { getRegion, isNetwork } from "@/lib/content";
import { stageInsets } from "@/lib/layout";
import { cameraTargetId, useApp, type AppState } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/hooks";
import { HOME_DIR, registry } from "./registry";

type Controls = ComponentRef<typeof TrackballControls>;

const IDLE_RESUME_MS = 15000;
const AUTO_ROTATE_SPEED = 0.12; // radians per second

/**
 * Distance at which a sphere of `radius` fits inside the free area
 * (freeW x freeH px) of a viewport that is fullH px tall.
 */
function fitDistance(radius: number, fovDeg: number, freeW: number, freeH: number, fullH: number) {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const tV = (t * freeH) / fullH;
  const tH = (t * freeW) / fullH;
  return (radius / Math.max(0.05, Math.min(tV, tH))) * 1.02;
}

/** Visible area (px) left over after side panels / bottom sheet cover part of the screen. */
function freeArea(s: AppState, w: number, h: number) {
  const i = stageInsets(s, w, h);
  return {
    w: Math.max(200, w - i.left - i.right),
    h: Math.max(160, h - i.top - i.bottom),
    shiftX: (i.left - i.right) / 2,
    shiftY: (i.top - i.bottom) / 2,
  };
}

export function CameraRig() {
  const controlsRef = useRef<Controls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);

  const rig = useRef({
    flying: true,
    target: new Vector3().copy(registry.center),
    dir: HOME_DIR.clone(),
    dist: 5,
    lastInteract: 0,
    interacted: false,
    shift: { x: 0, y: 0 },
    reduced: false,
    lastKey: "",
  });

  // Initial camera placement.
  useEffect(() => {
    const r = rig.current;
    r.reduced = prefersReducedMotion();
    const s = useApp.getState();
    const area = freeArea(s, size.width, size.height);
    r.dist = fitDistance(registry.radius, camera.fov, area.w, area.h, size.height);
    camera.position.copy(registry.center).addScaledVector(HOME_DIR, r.dist * 1.25);
    camera.lookAt(registry.center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track user interaction (stops auto-rotate and any camera flight).
  useEffect(() => {
    const el = gl.domElement;
    const onStart = () => {
      rig.current.lastInteract = performance.now();
      rig.current.interacted = true;
      rig.current.flying = false;
    };
    el.addEventListener("pointerdown", onStart);
    el.addEventListener("wheel", onStart, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onStart);
      el.removeEventListener("wheel", onStart);
    };
  }, [gl]);

  // Decide where the camera should go whenever the focus changes.
  useEffect(() => {
    const plan = (s: AppState) => {
      const id = cameraTargetId(s);
      const key = `${id}|${s.resetToken}|${s.view}|${s.brainReady}`;
      const r = rig.current;
      if (key === r.lastKey) return;
      r.lastKey = key;
      const area = freeArea(s, size.width, size.height);
      const home = fitDistance(registry.radius, camera.fov, area.w, area.h, size.height);
      const region = getRegion(id);
      const anchor = id ? registry.anchors.get(id) : undefined;
      if (region && !isNetwork(region) && anchor) {
        r.target.copy(anchor.target);
        r.dir.copy(anchor.dir);
        r.dist = anchor.distance > 0 ? anchor.distance : home * (region.deep ? 0.82 : 0.97);
      } else {
        r.target.copy(registry.center);
        r.dir.copy(HOME_DIR);
        r.dist = region && isNetwork(region) ? home * 0.92 : home;
      }
      r.flying = true;
    };
    plan(useApp.getState());
    return useApp.subscribe(plan);
  }, [camera, size.width, size.height]);

  const q = useRef({ full: new Quaternion(), part: new Quaternion(), id: new Quaternion(), v: new Vector3(), up: new Vector3(0, 1, 0) });

  useFrame((_, delta) => {
    const r = rig.current;
    const s = useApp.getState();
    const controls = controlsRef.current;
    const dt = Math.min(delta, 0.1);
    const target = controls ? controls.target : r.target;

    // Keep the brain centered in the area between panels.
    const area = freeArea(s, size.width, size.height);
    const kShift = r.reduced ? 1 : 1 - Math.exp(-dt * 6);
    r.shift.x += (area.shiftX - r.shift.x) * kShift;
    r.shift.y += (area.shiftY - r.shift.y) * kShift;
    registry.viewShift.x = r.shift.x;
    registry.viewShift.y = r.shift.y;
    camera.setViewOffset(size.width, size.height, -r.shift.x, -r.shift.y, size.width, size.height);

    if (r.flying) {
      const k = r.reduced ? 1 : 1 - Math.exp(-dt * 3.6);
      const t = q.current;
      t.v.copy(camera.position).sub(target);
      const curDist = t.v.length() || 1;
      t.v.divideScalar(curDist);
      t.full.setFromUnitVectors(t.v, r.dir);
      t.part.copy(t.id).slerp(t.full, k);
      t.v.applyQuaternion(t.part);
      target.lerp(r.target, k);
      const dist = curDist + (r.dist - curDist) * k;
      camera.position.copy(target).addScaledVector(t.v, dist);
      camera.up.lerp(t.up, k).normalize();
      camera.lookAt(target);
      if (t.v.angleTo(r.dir) < 0.002 && Math.abs(dist - r.dist) < 0.004 && target.distanceTo(r.target) < 0.002) {
        r.flying = false;
      }
    } else {
      const idle = !r.interacted || performance.now() - r.lastInteract > IDLE_RESUME_MS;
      const canSpin =
        !r.reduced && !cameraTargetId(s) && s.view !== "quiz" && s.modal === null && (s.view === "landing" || idle);
      if (canSpin) {
        const t = q.current;
        t.v.copy(camera.position).sub(target);
        t.part.setFromAxisAngle(camera.up, AUTO_ROTATE_SPEED * dt);
        t.v.applyQuaternion(t.part);
        camera.position.copy(target).add(t.v);
        camera.lookAt(target);
      }
    }
  });

  return (
    <TrackballControls
      ref={controlsRef}
      makeDefault
      noPan
      rotateSpeed={3.2}
      zoomSpeed={0.9}
      minDistance={1.6}
      maxDistance={9}
      staticMoving={false}
      dynamicDampingFactor={0.14}
      keys={["", "", ""]}
    />
  );
}
