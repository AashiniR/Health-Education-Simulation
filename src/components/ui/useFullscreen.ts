"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

export function useFullscreen() {
  const isFull = useSyncExternalStore(subscribe, () => !!document.fullscreenElement, () => false);
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!document.fullscreenEnabled,
    () => false,
  );
  const toggle = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* not allowed here */
    }
  };
  return { isFull, supported, toggle };
}
