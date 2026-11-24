"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Component, useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useWebGL } from "@/lib/webgl";
import { Brain2D } from "./Brain2D";

const BrainCanvas = dynamic(() => import("../brain/BrainCanvas"), { ssr: false, loading: () => null });

/** If three.js throws (old GPU, lost context), show the 2D diagram instead. */
class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[brain] 3D view failed, switching to the 2D diagram.", err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Loader() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border-2 border-sky-400/15" />
          <div className="spin-slow absolute inset-0 rounded-full border-2 border-transparent border-t-sky-300 border-r-sky-500/60" />
          <div className="absolute inset-4 rounded-full bg-sky-500/20 blur-md" />
        </div>
        <p className="text-base font-medium text-sky-100/80">Loading the 3D brain…</p>
      </div>
    </motion.div>
  );
}

export function BrainStage() {
  const webgl = useWebGL();
  const use2D = useApp((s) => s.use2D);
  const ready = useApp((s) => s.brainReady);
  const view = useApp((s) => s.view);
  const fail3D = useApp((s) => s.fail3D);
  const show2D = webgl === "no" || use2D;

  // Start the 3D view once the page has painted and the browser is idle,
  // so loading three.js never delays the first screen.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setStarted(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setStarted(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(30,80,200,0.22), rgba(5,7,13,0) 60%)" }}
        aria-hidden
      />
      {started && webgl === "yes" && !show2D && (
        <CanvasBoundary onError={fail3D}>
          <BrainCanvas />
        </CanvasBoundary>
      )}
      {show2D && <Brain2D interactive={view !== "landing"} />}
      <AnimatePresence>{!show2D && !ready && <Loader key="loader" />}</AnimatePresence>
      <p className="sr-only">
        {show2D
          ? "A 2D side view of the brain. Use the Brain regions list or the diagram to pick a region."
          : "An interactive 3D brain. Drag to rotate it. Use the Brain regions list to pick a region with the keyboard."}
      </p>
    </div>
  );
}
