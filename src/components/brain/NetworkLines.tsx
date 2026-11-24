"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  TubeGeometry,
  Vector3,
} from "three";
import { REGIONS, getRegion, isNetwork, warnOnce, type RegionContent } from "@/lib/content";
import { getEmphasis, useApp } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/hooks";
import { BRAIN_COLORS, getGlowTexture } from "./materials";
import { registry } from "./registry";

interface LinkDef {
  key: string;
  network: RegionContent;
  a: string;
  b: string;
  curve: CatmullRomCurve3;
  points: Vector3[];
  /** Start offset for the travelling pulses (so links don't pulse in sync). */
  phase: number;
}

const PULSES_PER_LINK = 2;
const FADE_BELOW = 0.3;
const pickMaterial = new MeshBasicMaterial({ visible: false });

/**
 * A curve from A to B that follows the brain's roundness just under the
 * surface (like a bundle of nerve fibers), instead of a straight line.
 */
function tractCurve(A: Vector3, B: Vector3, center: Vector3): CatmullRomCurve3 {
  const dA = A.clone().sub(center);
  const dB = B.clone().sub(center);
  const rA = dA.length();
  const rB = dB.length();
  dA.normalize();
  dB.normalize();
  const pts: Vector3[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const dir = dA.clone().lerp(dB, t);
    if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
    dir.normalize();
    const r = (rA + (rB - rA) * t) * (1 - 0.1 * Math.sin(Math.PI * t));
    pts.push(center.clone().addScaledVector(dir, r));
  }
  return new CatmullRomCurve3(pts);
}

/** Builds curved links for every network region, on both sides of the brain. */
function buildLinks(nodes: Map<string, Vector3>, center: Vector3): LinkDef[] {
  const out: LinkDef[] = [];
  for (const net of REGIONS.filter(isNetwork)) {
    for (const [a, b] of net.links ?? []) {
      const pa = nodes.get(a);
      const pb = nodes.get(b);
      if (!pa || !pb) {
        warnOnce(`Network "${net.id}" links "${a}" and "${b}", but one of them isn't on the 3D brain. Skipping that line.`);
        continue;
      }
      for (const side of [1, -1]) {
        const A = pa.clone();
        const B = pb.clone();
        if (side < 0) {
          A.x = 2 * center.x - A.x;
          B.x = 2 * center.x - B.x;
        }
        const curve = tractCurve(A, B, center);
        out.push({
          key: `${net.id}:${a}:${b}:${side}`,
          network: net,
          a,
          b,
          curve,
          points: curve.getPoints(48),
          phase: (out.length * 0.618) % 1,
        });
      }
    }
  }
  return out;
}

/** How strongly a link is "on" in the current mode (0..1). */
function linkStrength(l: LinkDef, mode: "thinking" | "active" | "passive"): number {
  const ra = getRegion(l.a);
  const rb = getRegion(l.b);
  const ends = Math.min(ra?.activity[mode] ?? 0.5, rb?.activity[mode] ?? 0.5);
  return (l.network.activity[mode] + ends) / 2;
}

function NetworkLink({ link }: { link: LinkDef }) {
  const lineRef = useRef<ComponentRef<typeof Line>>(null);
  const pulseRefs = useRef<(Sprite | null)[]>([]);
  const state = useRef({ strength: 1, emph: 0, dim: 1, phase: link.phase });
  const reduced = useRef(false);
  const base = useMemo(() => new Color(BRAIN_COLORS.line), []);
  const hi = useMemo(() => new Color(link.network.color), [link.network.color]);
  const tmp = useMemo(() => new Color(), []);
  const pos = useMemo(() => new Vector3(), []);

  // Invisible fat tube so the line can be hovered/clicked.
  useEffect(() => {
    reduced.current = prefersReducedMotion();
    const tube = new Mesh(new TubeGeometry(link.curve, 20, 0.045, 6, false), pickMaterial);
    tube.userData = { regionId: link.network.id, deep: false, network: true };
    registry.pickables.add(tube);
    return () => {
      registry.pickables.delete(tube);
      tube.geometry.dispose();
    };
  }, [link]);

  useFrame((_, delta) => {
    const s = useApp.getState();
    const em = getEmphasis(s);
    const st = state.current;
    const dt = Math.min(delta, 0.1);
    const k = reduced.current ? 1 : 1 - Math.exp(-dt * 3);
    const kf = reduced.current ? 1 : 1 - Math.exp(-dt * 10);
    const on = em.ids.has(link.network.id);
    st.strength += (linkStrength(link, s.mode) - st.strength) * k;
    st.emph += ((on ? 1 : 0) - st.emph) * kf;
    st.dim += ((em.any && !on ? (em.deep ? 0.2 : 0.35) : 1) - st.dim) * kf;

    const strength = st.strength;
    const faded = strength < FADE_BELOW;
    const s15 = strength * Math.sqrt(strength);
    // Quiet when not selected, brighter when the network is the focus.
    const vis = faded ? 0.05 : (0.08 + 0.6 * s15) * (1 + 0.7 * st.emph);
    const line = lineRef.current;
    if (line) {
      const m = line.material;
      // Selecting the network changes its color, but its strength still follows the mode,
      // so students can see the connections weaken in passive mode.
      m.linewidth = (0.5 + 2.6 * s15) * (1 + 0.4 * st.emph);
      m.opacity = Math.min(1, vis * st.dim);
      m.color.copy(tmp.copy(base).lerp(hi, st.emph));
    }

    if (!reduced.current) st.phase += dt * (0.08 + 0.5 * strength);
    const spriteOpacity = faded ? 0 : s15 * st.dim * (0.7 + 0.3 * st.emph);
    pulseRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const t = (st.phase + i / PULSES_PER_LINK) % 1;
      link.curve.getPoint(t, pos);
      sp.position.copy(pos);
      const mat = sp.material;
      mat.opacity = spriteOpacity * Math.sin(Math.PI * t);
      mat.color.copy(tmp.copy(base).lerp(hi, Math.max(st.emph, 0.35)));
      const sc = 0.07 + 0.08 * strength;
      sp.scale.set(sc, sc, sc);
      sp.visible = mat.opacity > 0.01;
    });
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={link.points}
        color={BRAIN_COLORS.line}
        lineWidth={3}
        transparent
        opacity={0.9}
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
        toneMapped={false}
        renderOrder={5}
      />
      {Array.from({ length: PULSES_PER_LINK }, (_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            pulseRefs.current[i] = el;
          }}
          renderOrder={6}
        >
          <spriteMaterial
            map={getGlowTexture()}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/** Glowing dots where network lines meet a region. */
function NetworkNodes({ ids, nodes, center }: { ids: string[]; nodes: Map<string, Vector3>; center: Vector3 }) {
  const refs = useRef<(Sprite | null)[]>([]);
  const points = useMemo(() => {
    const c = center;
    return ids.flatMap((id) => {
      const p = nodes.get(id);
      if (!p) return [];
      const m = p.clone();
      m.x = 2 * c.x - m.x;
      return [
        { id, p: p.clone() },
        { id, p: m },
      ];
    });
  }, [ids, nodes, center]);
  const netIds = useMemo(() => REGIONS.filter(isNetwork).map((r) => r.id), []);

  useFrame(() => {
    const s = useApp.getState();
    const em = getEmphasis(s);
    const netOn = netIds.some((id) => em.ids.has(id));
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const r = getRegion(points[i].id);
      const act = r?.activity[s.mode] ?? 0.5;
      const on = netOn || em.ids.has(points[i].id);
      const op = (0.25 + 0.6 * act) * (em.any && !on ? 0.3 : 1);
      sp.material.opacity += (op - sp.material.opacity) * 0.15;
      const sc = 0.12 + 0.1 * act;
      sp.scale.set(sc, sc, sc);
    });
  });

  return (
    <group>
      {points.map((pt, i) => (
        <sprite
          key={`${pt.id}-${i}`}
          position={pt.p}
          ref={(el) => {
            refs.current[i] = el;
          }}
          renderOrder={6}
        >
          <spriteMaterial
            map={getGlowTexture()}
            color={BRAIN_COLORS.line}
            transparent
            opacity={0.6}
            depthWrite={false}
            depthTest={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/** The Executive-Memory-Language network (and any other network regions). */
export function NetworkLines({ nodes, center }: { nodes: Map<string, Vector3>; center: Vector3 }) {
  const links = useMemo(() => buildLinks(nodes, center), [nodes, center]);
  const nodeIds = useMemo(() => Array.from(new Set(links.flatMap((l) => [l.a, l.b]))), [links]);
  return (
    <group>
      {links.map((l) => (
        <NetworkLink key={l.key} link={l} />
      ))}
      <NetworkNodes ids={nodeIds} nodes={nodes} center={center} />
    </group>
  );
}
