"use client";

/**
 * Layout sizes shared by the CSS panels, the 3D camera and the 2D diagram,
 * so the brain always centers itself in the space the panels leave free.
 */
import { useSyncExternalStore } from "react";
import type { AppState } from "./store";

export interface LayoutSizes {
  desktop: boolean;
  /** Left region list width (px), including its margin. */
  listWidth: number;
  /** Right info / quiz panel width (px), including its margin. */
  panelWidth: number;
}

export function layoutForWidth(w: number): LayoutSizes {
  if (w >= 1280) return { desktop: true, listWidth: 296, panelWidth: 456 };
  if (w >= 1024) return { desktop: true, listWidth: 256, panelWidth: 404 };
  return { desktop: false, listWidth: 0, panelWidth: 0 };
}

/** Bottom sheet height on phones/tablets as a fraction of the screen height. */
export const SHEET_FRACTION = 0.52;

export function isPanelOpen(s: Pick<AppState, "view" | "focusedId">): boolean {
  return s.view === "quiz" || ((s.view === "explore" || s.view === "tour") && !!s.focusedId);
}

/** Live measurements of on-screen UI (updated by the components themselves). */
export const uiMetrics = {
  /** Bottom edge (px) of the mode toggle + caption at the top of the screen. */
  modeBarBottom: 150,
};

/** Space (px) covered by UI on each side of the screen. */
export function stageInsets(s: Pick<AppState, "view" | "focusedId">, w: number, h: number) {
  if (s.view === "landing") return { top: 0, right: 0, bottom: 0, left: 0 };
  const L = layoutForWidth(w);
  const open = isPanelOpen(s);
  const top = Math.min(h * 0.45, uiMetrics.modeBarBottom + 8);
  if (L.desktop) return { top, right: open ? L.panelWidth : 0, bottom: 64, left: L.listWidth };
  return { top, right: 0, bottom: open ? Math.round(h * SHEET_FRACTION) : 84, left: 0 };
}

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/** Window width as React state (1366 during server rendering). */
export function useViewportWidth(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth,
    () => 1366,
  );
}

export function useLayout(): LayoutSizes {
  const w = useViewportWidth();
  return layoutForWidth(w);
}
