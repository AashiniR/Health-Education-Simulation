"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSyncExternalStore } from "react";
import { SITE } from "@/lib/content";
import { safeStorage, useCoarsePointer } from "@/lib/hooks";
import { isPanelOpen, useLayout } from "@/lib/layout";
import { useApp } from "@/lib/store";
import { useWebGL } from "@/lib/webgl";
import { IconReset } from "./icons";

const HINT_KEY = "brain-sim:hint-dismissed";
const listeners = new Set<() => void>();
function subscribeHint(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function dismissHint() {
  safeStorage.set(HINT_KEY, "1");
  memoryDismissed = true;
  listeners.forEach((l) => l());
}
let memoryDismissed = false;
const hintDismissed = () => memoryDismissed || safeStorage.get(HINT_KEY) === "1";

/** "Reset view" button and the first-time "drag to rotate" hint. */
export function BottomControls() {
  const s = useApp();
  const L = useLayout();
  const coarse = useCoarsePointer();
  const webgl = useWebGL();
  const dismissed = useSyncExternalStore(subscribeHint, hintDismissed, () => true);
  const panelOpen = isPanelOpen(s);
  if (s.view === "quiz") return null;
  if (!L.desktop && panelOpen) return null;

  const style = L.desktop ? { left: L.listWidth, right: panelOpen ? L.panelWidth : 16, bottom: 16 } : { left: 12, right: 12, bottom: 84 };
  const canReset = !!s.focusedId || s.view === "tour";

  return (
    <div className="pointer-events-none absolute z-20 flex flex-col items-center gap-2.5 transition-[left,right] duration-300" style={style}>
      <AnimatePresence>
        {!dismissed && s.view === "explore" && !s.use2D && !s.failed3D && webgl === "yes" && (
          <motion.div
            className="glass pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-2xl py-2 pr-2 pl-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role="note"
          >
            <span className="text-[15px] text-sky-50 lg:text-base">{coarse ? SITE.hintTouch : SITE.hintMouse}</span>
            <button type="button" className="btn btn-primary shrink-0 px-3.5 py-2 text-sm" onClick={dismissHint}>
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        className="glass btn pointer-events-auto rounded-xl px-4 py-2.5 text-[15px] text-sky-50 hover:border-sky-300/60"
        onClick={s.resetView}
        aria-label="Reset view (Escape key)"
        style={{ opacity: canReset ? 1 : 0.75 }}
      >
        <IconReset /> Reset view <kbd className="ml-1 hidden rounded border border-sky-300/30 px-1.5 text-xs text-sky-200/80 lg:inline">Esc</kbd>
      </button>
    </div>
  );
}
