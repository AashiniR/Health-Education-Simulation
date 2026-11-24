"use client";

import { useEffect, useRef } from "react";
import { getRegion } from "@/lib/content";
import { useCoarsePointer } from "@/lib/hooks";
import { hoverPointer } from "@/lib/pointer";
import { hoverLabelsAllowed, useApp } from "@/lib/store";
import { ColorDot } from "./ColorDot";

/** Small floating name tag that follows the mouse over the 3D / 2D brain. */
export function HoverLabel() {
  const hovered = useApp((s) => (hoverLabelsAllowed(s) && s.hoverSource === "brain" ? s.hoveredId : null));
  const coarse = useCoarsePointer();
  const ref = useRef<HTMLDivElement>(null);
  const region = getRegion(hovered);

  // Always track the pointer, so the label appears in the right place immediately.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      hoverPointer.x = e.clientX;
      hoverPointer.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (!region) return;
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) el.style.transform = `translate(${hoverPointer.x + 18}px, ${hoverPointer.y + 14}px)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [region]);

  if (!region || coarse) return null;
  return (
    <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-40" aria-hidden>
      <div className="glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-[15px] font-semibold whitespace-nowrap text-white" style={{ borderColor: `${region.color}88` }}>
        <ColorDot color={region.color} size={10} glow />
        {region.name}
      </div>
    </div>
  );
}
