"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { BufferGeometry, Mesh, ShaderMaterial } from "three";
import { REGIONS, getRegion, isNetwork, type ModeId } from "@/lib/content";
import { getEmphasis, useApp } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/hooks";
import { BRAIN_COLORS, createHaloMaterial, createRegionMaterial } from "./materials";

/** Average activity of all brain regions in a mode (used for neutral tissue). */
const contextActivity: Record<ModeId, number> = (() => {
  const parts = REGIONS.filter((r) => !isNetwork(r));
  const avg = (m: ModeId) => (parts.length ? parts.reduce((s, r) => s + r.activity[m], 0) / parts.length : 0.7);
  return { thinking: avg("thinking"), active: avg("active"), passive: avg("passive") };
})();

interface Props {
  geometry: BufferGeometry;
  /** null = neutral tissue that no region in brainContent.ts uses. */
  regionId: string | null;
}

/** One selectable region of the brain (or a neutral, non-selectable part). */
export function RegionMesh({ geometry, regionId }: Props) {
  const region = getRegion(regionId);
  const color = region?.color ?? BRAIN_COLORS.neutral;
  const material = useMemo(() => createRegionMaterial(color), [color]);
  const halo = useMemo(() => createHaloMaterial(color), [color]);
  const meshRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = prefersReducedMotion();
    return () => {
      material.dispose();
      halo.dispose();
    };
  }, [material, halo]);

  useFrame((state, delta) => {
    const s = useApp.getState();
    const em = getEmphasis(s);
    const on = !!regionId && em.ids.has(regionId);
    const act = region ? region.activity[s.mode] : contextActivity[s.mode];
    const mix = on ? 1 : 0;
    const bright = on ? 1 : em.any ? (em.deep ? 0.12 : 0.2) : 1;

    const dt = Math.min(delta, 0.1);
    const fast = reduced.current ? 1 : 1 - Math.exp(-dt * 10);
    const slow = reduced.current ? 1 : 1 - Math.exp(-dt * 3.2);
    const core = meshRef.current;
    const glow = haloRef.current;
    if (!core || !glow) return;
    const u = (core.material as ShaderMaterial).uniforms;
    u.uMix.value += (mix - u.uMix.value) * fast;
    u.uBright.value += (bright - u.uBright.value) * fast;
    u.uAct.value += (act - u.uAct.value) * slow;
    u.uTime.value = reduced.current ? 0 : state.clock.elapsedTime;

    (glow.material as ShaderMaterial).uniforms.uBright.value = u.uMix.value * 0.9;
    glow.visible = u.uMix.value > 0.01;
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={region ? 2 : 1} />
      <mesh ref={haloRef} geometry={geometry} material={halo} frustumCulled={false} visible={false} renderOrder={3} />
    </group>
  );
}
