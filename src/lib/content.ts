/**
 * Reads src/data/brainContent.ts, checks it for common mistakes, and exposes
 * clean lists the rest of the app uses. Teammates never need to edit this
 * file: problems in the content produce console warnings, not crashes.
 */
import {
  brainContent,
  type ModeId,
  type ModeContent,
  type RegionContent,
} from "@/data/brainContent";

export type { ModeId, RegionContent };

const MODE_IDS: ModeId[] = ["thinking", "active", "passive"];
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const warned = new Set<string>();

/** console.warn once per message (avoids spamming on re-renders). */
export function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  if (typeof console !== "undefined") console.warn(`[brainContent] ${message}`);
}

function clamp01(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
}

function cleanRegions(raw: RegionContent[]): RegionContent[] {
  const seen = new Set<string>();
  const out: RegionContent[] = [];
  for (const r of raw ?? []) {
    if (!r || typeof r.id !== "string" || !r.id.trim()) {
      warnOnce("A region is missing its `id`, so it was skipped.");
      continue;
    }
    if (seen.has(r.id)) {
      warnOnce(`Two regions share the id "${r.id}". The second one was skipped.`);
      continue;
    }
    seen.add(r.id);
    const color = typeof r.color === "string" && HEX.test(r.color) ? r.color : "#5aa9ff";
    if (color !== r.color) warnOnce(`Region "${r.id}" has an invalid color "${r.color}". Using blue.`);
    const activity = {} as Record<ModeId, number>;
    for (const m of MODE_IDS) {
      activity[m] = clamp01(r.activity?.[m], 0.5);
      if (typeof r.activity?.[m] !== "number") warnOnce(`Region "${r.id}" is missing an activity level for "${m}". Using 0.5.`);
    }
    out.push({
      ...r,
      name: r.name || r.id,
      color,
      colorName: r.colorName || "",
      whatItDoes: r.whatItDoes || "",
      aiEffect: r.aiEffect || "",
      activity,
    });
  }
  return out;
}

function cleanModes(raw: ModeContent[]): ModeContent[] {
  const byId = new Map((raw ?? []).map((m) => [m.id, m]));
  return MODE_IDS.map(
    (id) =>
      byId.get(id) ?? {
        id,
        label: id,
        shortLabel: id,
        caption: "",
      },
  );
}

export const SITE = brainContent.site;
export const MODES = cleanModes(brainContent.modes);
export const REGIONS = cleanRegions(brainContent.regions);
export const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));
export const HABITS = brainContent.habits;
export const SOURCES = brainContent.sources;
export const MODEL_CONFIG = brainContent.model;

export function getRegion(id: string | null | undefined): RegionContent | undefined {
  return id ? REGION_BY_ID.get(id) : undefined;
}

export function isNetwork(r: RegionContent | undefined): boolean {
  return r?.type === "network";
}

/** Tour steps: ids from tourOrder that exist. Falls back to every region. */
export const TOUR_IDS: string[] = (() => {
  const ids = (brainContent.tourOrder ?? []).filter((id) => {
    if (REGION_BY_ID.has(id)) return true;
    warnOnce(`tourOrder lists "${id}", but no region has that id. Skipping it.`);
    return false;
  });
  return ids.length ? Array.from(new Set(ids)) : REGIONS.map((r) => r.id);
})();

/** Names of 3D shapes a region uses (defaults to its id). Normalized for matching. */
export function meshKeysFor(r: RegionContent): string[] {
  return (r.meshNames?.length ? r.meshNames : [r.id]).map(normalizeMeshName);
}

export function normalizeMeshName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, "-");
}

export function activityLabel(level: number): "High" | "Medium" | "Low" {
  if (level >= 0.75) return "High";
  if (level >= 0.5) return "Medium";
  return "Low";
}

// ----------------------------------------------------------------------------
// Quiz
// ----------------------------------------------------------------------------

export interface QuizItem {
  kind: "identify" | "find";
  regionId: string;
  prompt: string;
  /** Region ids to show as choices (identify only). */
  options: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds one round of the quiz. `pickable` is the set of region ids that can
 * be shown/clicked in the current view (3D or 2D). Questions about regions
 * that aren't there are skipped.
 */
export function buildQuiz(pickable: Set<string> | null): QuizItem[] {
  const canShow = (id: string) => REGION_BY_ID.has(id) && (!pickable || pickable.has(id));
  const optionPool = REGIONS.filter((r) => canShow(r.id) && !isNetwork(r)).map((r) => r.id);
  const valid = (brainContent.quiz.questions ?? []).filter((q) => {
    if (!REGION_BY_ID.has(q.regionId)) {
      warnOnce(`A quiz question points at "${q.regionId}", but no region has that id. Skipping it.`);
      return false;
    }
    return canShow(q.regionId);
  });

  const count = Math.max(1, Math.min(brainContent.quiz.questionsPerRound || 7, valid.length));
  // Mix the two kinds so a round isn't all one type.
  const identify = shuffle(valid.filter((q) => q.type === "identify"));
  const find = shuffle(valid.filter((q) => q.type === "find"));
  const mixed: typeof valid = [];
  while (mixed.length < count && (identify.length || find.length)) {
    const takeFind = find.length && (!identify.length || mixed.length % 2 === 1);
    mixed.push((takeFind ? find.shift() : identify.shift())!);
  }

  return mixed.map((q) => {
    if (q.type === "find") {
      return { kind: "find", regionId: q.regionId, prompt: q.prompt, options: [] };
    }
    const distractors = shuffle(optionPool.filter((id) => id !== q.regionId)).slice(0, 3);
    return {
      kind: "identify",
      regionId: q.regionId,
      prompt: "Which region is this?",
      options: shuffle([q.regionId, ...distractors]),
    };
  });
}
