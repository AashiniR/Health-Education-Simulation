"use client";

import { useSyncExternalStore } from "react";

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
}

/** React hook for a CSS media query. Returns `serverValue` during SSR. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

export const DESKTOP_QUERY = "(min-width: 1024px)";

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY, true);
}

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}

/** True on devices whose main pointer is a finger (no hover). */
export function useCoarsePointer() {
  return useMediaQuery("(hover: none) and (pointer: coarse)", false);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** localStorage that never throws (private mode, blocked storage, SSR). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};
