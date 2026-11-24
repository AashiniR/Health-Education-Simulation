"use client";

import { useSyncExternalStore } from "react";

/**
 * Cheap WebGL support check (no context is created here: creating a test
 * context forces the GPU process to start and blocks the page). If the real
 * 3D context later fails to start, BrainStage falls back to the 2D diagram.
 */
function detect(): "yes" | "no" {
  return typeof window !== "undefined" && ("WebGL2RenderingContext" in window || "WebGLRenderingContext" in window) ? "yes" : "no";
}

const noopSubscribe = () => () => {};

/** "unknown" during server rendering, then "yes" / "no". */
export function useWebGL(): "unknown" | "yes" | "no" {
  return useSyncExternalStore(noopSubscribe, detect, () => "unknown" as const);
}
