/// <reference lib="webworker" />
/**
 * Builds the procedural brain off the main thread so the page stays
 * responsive on slow Chromebooks while the geometry is generated.
 */
import { buildProceduralBrain } from "./proceduralBrain";
import { serializeModel } from "./serialize";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = () => {
  try {
    const { data, transfer } = serializeModel(buildProceduralBrain());
    ctx.postMessage({ ok: true, data }, transfer);
  } catch (err) {
    ctx.postMessage({ ok: false, error: String(err) });
  }
};
