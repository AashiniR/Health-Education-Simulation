"use client";

/**
 * The 3D brain canvas. Loaded lazily (see BrainStage) so the page appears
 * instantly and three.js downloads in the background.
 *
 * ─── Swapping in a real brain model ──────────────────────────────────────────
 * 1. Put your segmented model at  public/models/brain.glb
 * 2. In src/data/brainContent.ts set   model: { file: "/models/brain.glb", ... }
 * 3. Name the meshes in the model after region ids (e.g. "temporal-lobe"), or
 *    list the model's mesh names in a region's `meshNames`.
 * Details: GlbBrain.tsx and the README section "Swapping in a real brain model".
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial, Vector2 } from "three";
import { MODEL_CONFIG } from "@/lib/content";
import type { BrainModel } from "./model";
import { BrainScene } from "./BrainScene";
import { CameraRig } from "./CameraRig";
import { GlbBrain } from "./GlbBrain";
import { loadProceduralBrain } from "./loadProceduralBrain";
import { createBackdropMaterial } from "./materials";
import { Picker } from "./Picker";
import { registry } from "./registry";

function ProceduralBrain() {
  const [model, setModel] = useState<BrainModel | null>(null);
  useEffect(() => {
    let alive = true;
    loadProceduralBrain().then((m) => alive && setModel(m));
    return () => {
      alive = false;
    };
  }, []);
  return model ? <BrainScene model={model} /> : null;
}

/** If the custom model fails to load, fall back to the built-in brain. */
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn(`[brain] Could not load ${MODEL_CONFIG.file}. Using the built-in brain instead.`, err);
  }
  render() {
    return this.state.failed ? <ProceduralBrain /> : this.props.children;
  }
}

function BrainModelSwitch() {
  const file = MODEL_CONFIG.file;
  if (!file) return <ProceduralBrain />;
  return (
    <ModelBoundary>
      <Suspense fallback={null}>
        <GlbBrain file={file} />
      </Suspense>
    </ModelBoundary>
  );
}

/** Soft radial blue glow behind the brain (follows the brain when panels shift it). */
function Backdrop() {
  const material = useMemo(() => createBackdropMaterial(), []);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    return g;
  }, []);
  const size = useThree((s) => s.size);
  const meshRef = useRef<Mesh>(null);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );
  useFrame(() => {
    const m = meshRef.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    (m.uniforms.uCenter.value as Vector2).set(
      0.5 + registry.viewShift.x / size.width,
      0.5 - registry.viewShift.y / size.height,
    );
    m.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={-10} />;
}

export default function BrainCanvas() {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, dpr]}
      flat
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 38, near: 0.05, far: 60, position: [4, 1.6, 3] }}
      onCreated={({ gl }) => {
        gl.setClearColor("#05070d", 1);
      }}
      aria-hidden
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          document.documentElement.classList.add("low-power");
        }}
      />
      <Backdrop />
      <BrainModelSwitch />
      <CameraRig />
      <Picker />
    </Canvas>
  );
}
