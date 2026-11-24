import type { BrainModel } from "./model";
import { deserializeModel, type SerializedModel } from "./serialize";

let pending: Promise<BrainModel> | null = null;

async function buildOnMainThread(): Promise<BrainModel> {
  const { buildProceduralBrain } = await import("./proceduralBrain");
  // Yield first so the loading screen can paint.
  await new Promise((r) => setTimeout(r, 30));
  return buildProceduralBrain();
}

/** Builds the procedural brain in a Web Worker (falls back to the main thread). */
export function loadProceduralBrain(): Promise<BrainModel> {
  if (pending) return pending;
  pending = new Promise<BrainModel>((resolve) => {
    let worker: Worker | null = null;
    const fallback = () => {
      worker?.terminate();
      worker = null;
      buildOnMainThread().then(resolve);
    };
    try {
      worker = new Worker(new URL("./brain.worker.ts", import.meta.url), { type: "module" });
    } catch {
      fallback();
      return;
    }
    const timer = setTimeout(fallback, 15000);
    worker.onmessage = (e: MessageEvent<{ ok: boolean; data?: SerializedModel }>) => {
      clearTimeout(timer);
      worker?.terminate();
      if (e.data.ok && e.data.data) resolve(deserializeModel(e.data.data));
      else fallback();
    };
    worker.onerror = () => {
      clearTimeout(timer);
      fallback();
    };
    worker.postMessage("build");
  });
  return pending;
}
