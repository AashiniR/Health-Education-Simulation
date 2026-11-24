"use client";

/**
 * Simple 2D clickable brain diagram (side view, front of the brain on the
 * left). Used when WebGL isn't available, or when someone picks "2D view".
 * Region shapes are matched to brainContent.ts the same way as the 3D model.
 */
import { useEffect, useMemo } from "react";
import { REGIONS, getRegion, isNetwork, meshKeysFor, type RegionContent } from "@/lib/content";
import { stageInsets, useViewportWidth } from "@/lib/layout";
import { getEmphasis, hoverLabelsAllowed, pickingEnabled, useApp } from "@/lib/store";

type Pt = [number, number];

/** Smooth open curve through points (Catmull-Rom → cubic Bézier). */
function curve(pts: Pt[], move: boolean): string {
  let d = move ? `M${pts[0][0]},${pts[0][1]}` : "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const rev = (p: Pt[]) => p.slice().reverse();
function shape(...pieces: Pt[][]): string {
  return pieces.map((p, i) => curve(p, i === 0)).join(" ") + " Z";
}

// Outline and fissures (viewBox 0 0 800 600).
const o1: Pt[] = [[215, 345], [160, 348], [112, 328], [95, 295], [100, 245], [125, 190], [170, 145], [230, 112], [290, 96]];
const o2: Pt[] = [[290, 96], [360, 82], [430, 78]];
const o3: Pt[] = [[430, 78], [510, 82], [560, 95], [605, 115]];
const o4: Pt[] = [[605, 115], [650, 145], [690, 195], [712, 250], [712, 300], [695, 345], [660, 375], [615, 388]];
const o5: Pt[] = [[615, 388], [560, 408], [480, 428], [390, 432], [310, 415], [258, 385], [230, 360], [215, 345]];
const pf: Pt[] = [[290, 96], [268, 170], [245, 250], [228, 310], [215, 345]];
const syl1: Pt[] = [[215, 345], [260, 330], [320, 318], [380, 305]];
const syl2: Pt[] = [[380, 305], [440, 295], [500, 285]];
const central: Pt[] = [[380, 305], [395, 240], [412, 160], [430, 78]];
const tp: Pt[] = [[500, 285], [560, 290], [612, 300]];
const po: Pt[] = [[605, 115], [600, 180], [605, 245], [612, 300]];
const to: Pt[] = [[612, 300], [612, 345], [615, 388]];

interface Part2D {
  name: string;
  d: string;
  /** Where network lines attach. */
  node: Pt;
  stroke?: boolean;
}

const PARTS: Part2D[] = [
  { name: "brainstem", d: "M452,392 C468,450 478,505 488,578 L542,578 C536,505 530,450 522,392 Z", node: [495, 470] },
  { name: "cerebellum", d: "M505,412 C520,372 600,360 660,372 C712,384 726,428 702,460 C672,498 566,500 520,470 C500,456 496,432 505,412 Z", node: [620, 440] },
  { name: "prefrontal-cortex", d: shape(o1, rev(pf)), node: [175, 225] },
  { name: "frontal-lobe", d: shape(pf, syl1, central, rev(o2)), node: [330, 190] },
  { name: "parietal-lobe", d: shape(o3, po, rev(tp), rev(syl2), central), node: [505, 175] },
  { name: "occipital-lobe", d: shape(o4, rev(to), rev(po)), node: [660, 270] },
  { name: "temporal-lobe", d: shape(syl1, syl2, tp, to, o5), node: [430, 345] },
  {
    name: "hippocampus",
    d: "M318,388 C360,404 430,404 482,378 C512,362 530,342 536,318",
    node: [470, 382],
    stroke: true,
  },
];

const OUTLINE = shape(o1, o2, o3, o4, o5);

const GYRI = [
  "M140,220 C170,200 190,230 220,205",
  "M130,280 C160,265 185,290 205,270",
  "M175,160 C200,180 225,150 250,170",
  "M305,140 C330,170 340,210 325,250",
  "M350,110 C365,150 360,200 352,260",
  "M455,110 C470,150 470,200 445,250",
  "M520,120 C540,160 520,200 560,235",
  "M640,180 C660,210 650,250 680,280",
  "M300,370 C350,355 420,372 470,352",
  "M330,400 C380,392 450,405 540,380",
  "M560,320 C580,340 590,360 585,380",
];

function partFor(r: RegionContent): Part2D | undefined {
  const keys = meshKeysFor(r);
  return PARTS.find((p) => keys.includes(p.name));
}

export function Brain2D({ interactive }: { interactive: boolean }) {
  const state = useApp();
  const em = getEmphasis(state);
  const width = useViewportWidth();
  const height = typeof window === "undefined" ? 768 : window.innerHeight;
  const insets = stageInsets(state, width, height);

  const mapping = useMemo(() => {
    const byPart = new Map<string, RegionContent>();
    for (const r of REGIONS) {
      if (isNetwork(r)) continue;
      const p = partFor(r);
      if (p && !byPart.has(p.name)) byPart.set(p.name, r);
    }
    return byPart;
  }, []);

  const networks = useMemo(() => REGIONS.filter(isNetwork), []);
  const nodeOf = useMemo(() => {
    const m = new Map<string, Pt>();
    mapping.forEach((r, part) => m.set(r.id, PARTS.find((p) => p.name === part)!.node));
    return m;
  }, [mapping]);

  useEffect(() => {
    const ids = Array.from(mapping.values()).map((r) => r.id);
    for (const n of networks) if ((n.links ?? []).some(([a, b]) => nodeOf.has(a) && nodeOf.has(b))) ids.push(n.id);
    useApp.getState().setPickable(ids);
  }, [mapping, networks, nodeOf]);

  const canPick = interactive && pickingEnabled(state);
  const labels = hoverLabelsAllowed(state);

  const regionProps = (r: RegionContent | undefined) => {
    if (!r || !interactive) return {};
    return {
      role: "button",
      tabIndex: canPick ? 0 : -1,
      "aria-label": labels ? r.name : "Brain region",
      "aria-disabled": !canPick,
      onClick: () => canPick && state.pickRegion(r.id),
      onKeyDown: (e: React.KeyboardEvent) => {
        if ((e.key === "Enter" || e.key === " ") && canPick) {
          e.preventDefault();
          state.pickRegion(r.id);
        }
      },
      onPointerEnter: (e: React.PointerEvent) => e.pointerType !== "touch" && canPick && state.setHovered(r.id),
      onPointerLeave: () => state.setHovered(null),
      style: { cursor: canPick ? "pointer" : "default" },
    };
  };

  const look = (r: RegionContent | undefined) => {
    const on = !!r && em.ids.has(r.id);
    const act = r ? r.activity[state.mode] : 0.6;
    const dim = em.any && !on ? (em.deep ? 0.25 : 0.35) : 1;
    return { on, act, dim, color: r?.color ?? "#3f9dff" };
  };

  return (
    <div
      className="absolute flex items-center justify-center transition-[inset] duration-300"
      style={{ top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left, opacity: interactive ? 1 : 0.55 }}
    >
      <svg viewBox="40 50 720 540" className="h-full max-h-[78vh] w-full max-w-[980px] p-3" aria-label="Brain diagram, side view. The front of the brain is on the left.">
        <defs>
          <radialGradient id="b2d-bg" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#1a4fb8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#05070d" stopOpacity="0" />
          </radialGradient>
          <clipPath id="b2d-clip">
            <path d={OUTLINE} />
          </clipPath>
          <filter id="b2d-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx="400" cy="310" rx="380" ry="270" fill="url(#b2d-bg)" />

        {PARTS.filter((p) => !p.stroke).map((p) => {
          const r = mapping.get(p.name);
          const v = look(r);
          return (
            <g key={p.name} {...regionProps(r)}>
              <path
                d={p.d}
                fill={v.on ? v.color : "#0d3a9a"}
                fillOpacity={v.on ? 0.75 : (0.18 + 0.4 * v.act) * v.dim}
                stroke={v.on ? v.color : "#5aa9ff"}
                strokeOpacity={v.on ? 1 : 0.7 * v.dim}
                strokeWidth={v.on ? 4 : 2}
                filter={v.on ? "url(#b2d-glow)" : undefined}
                style={{ transition: "fill 250ms, fill-opacity 400ms, stroke 250ms" }}
              />
            </g>
          );
        })}

        <g clipPath="url(#b2d-clip)" pointerEvents="none" fill="none" stroke="#7cc4ff" strokeOpacity="0.28" strokeWidth="2.5" strokeLinecap="round">
          {GYRI.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {PARTS.filter((p) => p.stroke).map((p) => {
          const r = mapping.get(p.name);
          const v = look(r);
          return (
            <g key={p.name} {...regionProps(r)}>
              {/* wide invisible stroke = easier to click */}
              <path d={p.d} fill="none" stroke="transparent" strokeWidth={34} strokeLinecap="round" />
              <path
                d={p.d}
                fill="none"
                stroke={v.on ? v.color : "#9ccbff"}
                strokeOpacity={v.on ? 1 : (0.35 + 0.45 * v.act) * v.dim}
                strokeWidth={v.on ? 16 : 11}
                strokeLinecap="round"
                strokeDasharray={v.on ? undefined : "3 7"}
                filter={v.on ? "url(#b2d-glow)" : undefined}
              />
            </g>
          );
        })}

        {networks.map((net) => {
          const v = look(net);
          return (
            <g key={net.id} {...regionProps(net)}>
              {(net.links ?? []).map(([a, b]) => {
                const A = nodeOf.get(a);
                const B = nodeOf.get(b);
                if (!A || !B) return null;
                const ra = getRegion(a);
                const rb = getRegion(b);
                const s = (net.activity[state.mode] + Math.min(ra?.activity[state.mode] ?? 0.5, rb?.activity[state.mode] ?? 0.5)) / 2;
                const faded = s < 0.3;
                const mx = (A[0] + B[0]) / 2;
                const my = Math.min(A[1], B[1]) - 40 - 0.08 * Math.abs(A[0] - B[0]);
                const d = `M${A[0]},${A[1]} Q${mx},${my} ${B[0]},${B[1]}`;
                return (
                  <g key={`${a}-${b}`}>
                    <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
                    <path
                      d={d}
                      fill="none"
                      stroke={v.on ? net.color : "#4f8dff"}
                      strokeOpacity={(faded ? 0.12 : 0.4 + 0.6 * s) * v.dim}
                      strokeWidth={(1.5 + 5 * s) * (v.on ? 1.4 : 1)}
                      strokeLinecap="round"
                      strokeDasharray="10 14"
                      className="b2d-flow"
                      style={{ animationDuration: `${(2.4 / Math.max(0.15, s)).toFixed(2)}s` }}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
        {Array.from(nodeOf.entries()).map(([id, [x, y]]) => {
          const r = getRegion(id);
          const act = r?.activity[state.mode] ?? 0.5;
          return <circle key={id} cx={x} cy={y} r={5 + 5 * act} fill="#9ccbff" fillOpacity={0.35 + 0.5 * act} pointerEvents="none" />;
        })}
      </svg>
      <style>{`
        @keyframes b2d-flow { to { stroke-dashoffset: -48; } }
        .b2d-flow { animation: b2d-flow linear infinite; }
      `}</style>
    </div>
  );
}
