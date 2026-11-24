"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect } from "react";
import { getRegion } from "@/lib/content";
import { isPanelOpen } from "@/lib/layout";
import { useApp } from "@/lib/store";
import { BottomControls } from "./ui/BottomControls";
import { BrainStage } from "./ui/BrainStage";
import { HoverLabel } from "./ui/HoverLabel";
import { InfoPanel } from "./ui/InfoPanel";
import { Landing } from "./ui/Landing";
import { Modals } from "./ui/Modals";
import { ModeBar } from "./ui/ModeToggle";
import { QuizPanel } from "./ui/QuizPanel";
import { RegionChips, RegionList } from "./ui/RegionList";
import { SidePanel } from "./ui/SidePanel";
import { TopBar } from "./ui/TopBar";

/** Global keys: Esc = reset view, arrows / PageUp / PageDown = tour back/next. */
function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const s = useApp.getState();
      if (s.modal) return; // the dialog handles its own keys
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role=radiogroup], [contenteditable=true]")) return;

      if (e.key === "Escape") {
        if (s.view === "explore" || s.view === "tour") s.resetView();
        return;
      }
      const forward = e.key === "ArrowRight" || e.key === "PageDown";
      const back = e.key === "ArrowLeft" || e.key === "PageUp";
      if (!forward && !back) return;
      if (s.view === "tour") {
        e.preventDefault();
        s.tourStep(forward ? 1 : -1);
      } else if (s.view === "explore" && s.focusedId) {
        e.preventDefault();
        s.stepRegion(forward ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function Simulation() {
  const view = useApp((s) => s.view);
  const focusedId = useApp((s) => s.focusedId);
  const open = useApp(isPanelOpen);
  const region = getRegion(focusedId);
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h1 className="sr-only">Your Brain on AI: brain simulation</h1>
      <TopBar />
      <ModeBar />
      <RegionList />
      <RegionChips />
      <BottomControls />
      <SidePanel
        open={open}
        panelKey={view === "quiz" ? "quiz" : (focusedId ?? "none")}
        label={view === "quiz" ? "Quiz" : `About the ${region?.name ?? "region"}`}
      >
        {view === "quiz" ? <QuizPanel /> : <InfoPanel />}
      </SidePanel>
      <p className="sr-only" aria-live="polite">
        {region && view !== "quiz" ? `${region.name} selected.` : ""}
      </p>
    </motion.div>
  );
}

export function App() {
  const view = useApp((s) => s.view);
  useKeyboard();
  return (
    <MotionConfig reducedMotion="user">
      <main className="fixed inset-0 overflow-hidden bg-[#05070d]">
        <BrainStage />
        {/* initial={false}: the first screen is painted visible right away (fast LCP). */}
        <AnimatePresence mode="wait" initial={false}>
          {view === "landing" ? <Landing key="landing" /> : <Simulation key="sim" />}
        </AnimatePresence>
        <HoverLabel />
        <Modals />
      </main>
    </MotionConfig>
  );
}
