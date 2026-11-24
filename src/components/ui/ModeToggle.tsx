"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { MODES } from "@/lib/content";
import { isPanelOpen, uiMetrics, useLayout } from "@/lib/layout";
import { useApp } from "@/lib/store";

/** "Thinking on your own / Active AI / Passive AI" switch plus the mode caption. */
export function ModeBar() {
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);
  const panelOpen = useApp(isPanelOpen);
  const L = useLayout();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);

  // Tell the 3D camera how much room the toggle + caption take up.
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      uiMetrics.modeBarBottom = el.getBoundingClientRect().bottom;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  const index = MODES.indexOf(current);

  const onKey = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    const next = MODES[(index + dir + MODES.length) % MODES.length];
    setMode(next.id);
    refs.current[MODES.indexOf(next)]?.focus();
  };

  const style = L.desktop
    ? { left: L.listWidth, right: panelOpen ? L.panelWidth : 16, top: 76 }
    : { left: 12, right: 12, top: 68 };

  return (
    <div ref={barRef} className="pointer-events-none absolute z-20 flex flex-col items-center transition-[left,right] duration-300 @container" style={style}>
      <div
        role="radiogroup"
        aria-label="Simulation mode: how is the student using their brain?"
        className="glass pointer-events-auto flex w-full max-w-[680px] gap-1 rounded-2xl p-1.5"
        onKeyDown={onKey}
      >
        {MODES.map((m, i) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setMode(m.id)}
              className={`relative flex-1 rounded-xl px-2 py-2.5 text-[15px] font-semibold transition-colors @[560px]:text-base ${
                active ? "text-white" : "text-sky-200/75 hover:bg-sky-400/10 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#3d95ff] to-[#1f6fe0] shadow-[0_6px_20px_-6px_rgba(47,134,255,0.9)]"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <span className="relative">
                <span className="@[560px]:hidden">{m.shortLabel}</span>
                <span className="hidden @[560px]:inline">{m.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 w-full max-w-[680px]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current.id}
            className="glass pointer-events-auto rounded-xl px-4 py-2.5 text-center text-[15px] leading-snug text-sky-50 lg:text-[17px]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
          >
            <span className="sr-only">{current.label}: </span>
            {current.caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
