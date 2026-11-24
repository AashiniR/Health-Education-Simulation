"use client";

import { create } from "zustand";
import {
  REGIONS,
  TOUR_IDS,
  buildQuiz,
  getRegion,
  type ModeId,
  type QuizItem,
} from "./content";

export type View = "landing" | "explore" | "tour" | "quiz";
export type Modal = null | "habits" | "sources";

export interface QuizState {
  items: QuizItem[];
  index: number;
  score: number;
  /** The id the student picked for the current question (null = not answered yet). */
  picked: string | null;
  finished: boolean;
}

export interface AppState {
  view: View;
  mode: ModeId;
  hoveredId: string | null;
  /** Where the hover came from: the brain itself (shows the floating label) or the list. */
  hoverSource: "brain" | "list";
  focusedId: string | null;
  tourIndex: number;
  quiz: QuizState;
  modal: Modal;
  /** User chose the simple 2D diagram (or WebGL is unavailable). */
  use2D: boolean;
  /** The 3D view failed to start on this device (so don't offer it). */
  failed3D: boolean;
  brainReady: boolean;
  /** Region ids that can be highlighted/clicked in the current brain view. */
  pickable: string[] | null;
  /** Bumps each time the camera should return home. */
  resetToken: number;

  setMode: (m: ModeId) => void;
  setHovered: (id: string | null, source?: "brain" | "list") => void;
  focusRegion: (id: string | null) => void;
  stepRegion: (dir: 1 | -1) => void;
  /** A region was clicked/tapped (3D, 2D or list). Routes by current view. */
  pickRegion: (id: string | null) => void;
  resetView: () => void;
  goHome: () => void;
  startExplore: () => void;
  startTour: (index?: number) => void;
  tourStep: (dir: 1 | -1) => void;
  startQuiz: () => void;
  answerQuiz: (id: string) => void;
  nextQuestion: () => void;
  openModal: (m: Modal) => void;
  set2D: (v: boolean) => void;
  fail3D: () => void;
  setBrainReady: (v: boolean) => void;
  setPickable: (ids: string[] | null) => void;
}

const emptyQuiz: QuizState = { items: [], index: 0, score: 0, picked: null, finished: false };

export const useApp = create<AppState>()((set, get) => ({
  view: "landing",
  mode: "thinking",
  hoveredId: null,
  hoverSource: "brain",
  focusedId: null,
  tourIndex: 0,
  quiz: emptyQuiz,
  modal: null,
  use2D: false,
  failed3D: false,
  brainReady: false,
  pickable: null,
  resetToken: 0,

  setMode: (mode) => set({ mode }),
  setHovered: (hoveredId, hoverSource = "brain") => {
    const s = get();
    if (s.hoveredId !== hoveredId || s.hoverSource !== hoverSource) set({ hoveredId, hoverSource });
  },
  focusRegion: (id) => {
    const s = get();
    if (id && !getRegion(id)) return;
    if (s.view === "tour" && id) {
      const i = TOUR_IDS.indexOf(id);
      set({ focusedId: id, tourIndex: i >= 0 ? i : s.tourIndex });
      return;
    }
    set({ focusedId: id, view: s.view === "landing" ? "explore" : s.view });
  },
  stepRegion: (dir) => {
    const { focusedId } = get();
    const i = REGIONS.findIndex((r) => r.id === focusedId);
    const next = REGIONS[(i + dir + REGIONS.length) % REGIONS.length];
    if (next) set({ focusedId: next.id });
  },
  pickRegion: (id) => {
    const s = get();
    if (s.view === "quiz") {
      const item = s.quiz.items[s.quiz.index];
      if (id && item?.kind === "find" && !s.quiz.picked && !s.quiz.finished) get().answerQuiz(id);
      return;
    }
    if (s.view === "landing") return;
    if (id) get().focusRegion(id);
  },
  resetView: () =>
    set((s) => ({
      focusedId: null,
      hoveredId: null,
      view: s.view === "tour" ? "explore" : s.view,
      resetToken: s.resetToken + 1,
    })),
  goHome: () =>
    set((s) => ({
      view: "landing",
      focusedId: null,
      hoveredId: null,
      modal: null,
      quiz: emptyQuiz,
      resetToken: s.resetToken + 1,
    })),
  startExplore: () =>
    set((s) => ({ view: "explore", focusedId: null, quiz: emptyQuiz, resetToken: s.resetToken + 1 })),
  startTour: (index = 0) => {
    const i = Math.max(0, Math.min(index, TOUR_IDS.length - 1));
    set({ view: "tour", tourIndex: i, focusedId: TOUR_IDS[i] ?? null, quiz: emptyQuiz, modal: null });
  },
  tourStep: (dir) => {
    const s = get();
    if (s.view !== "tour") return;
    const i = s.tourIndex + dir;
    if (i < 0) return;
    if (i >= TOUR_IDS.length) {
      // Finished the tour: back to free exploring.
      set({ view: "explore", focusedId: null, resetToken: s.resetToken + 1 });
      return;
    }
    set({ tourIndex: i, focusedId: TOUR_IDS[i] });
  },
  startQuiz: () => {
    const p = get().pickable;
    const items = buildQuiz(p ? new Set(p) : null);
    set((s) => ({
      view: "quiz",
      focusedId: null,
      hoveredId: null,
      modal: null,
      quiz: { items, index: 0, score: 0, picked: null, finished: items.length === 0 },
      resetToken: s.resetToken + 1,
    }));
  },
  answerQuiz: (id) => {
    const { quiz } = get();
    const item = quiz.items[quiz.index];
    if (!item || quiz.picked) return;
    const correct = id === item.regionId;
    set({ quiz: { ...quiz, picked: id, score: quiz.score + (correct ? 1 : 0) }, hoveredId: null });
  },
  nextQuestion: () => {
    const { quiz } = get();
    const index = quiz.index + 1;
    if (index >= quiz.items.length) set({ quiz: { ...quiz, picked: null, finished: true } });
    else set({ quiz: { ...quiz, index, picked: null } });
  },
  openModal: (modal) => set({ modal }),
  set2D: (use2D) => set({ use2D, hoveredId: null }),
  fail3D: () => set({ failed3D: true, use2D: true, hoveredId: null }),
  setBrainReady: (brainReady) => set({ brainReady }),
  setPickable: (pickable) => set({ pickable }),
}));

// ----------------------------------------------------------------------------
// Derived "emphasis" state shared by the 3D brain, the 2D diagram and lists.
// ----------------------------------------------------------------------------

export interface Emphasis {
  /** Region ids shown in their highlight color. */
  ids: Set<string>;
  /** True when anything is emphasized (everything else dims). */
  any: boolean;
  /** True when a deep region (e.g. hippocampus) is emphasized: x-ray the rest. */
  deep: boolean;
}

let lastState: AppState | null = null;
let lastEmphasis: Emphasis = { ids: new Set(), any: false, deep: false };

export function currentQuizItem(s: AppState): QuizItem | undefined {
  return s.view === "quiz" && !s.quiz.finished ? s.quiz.items[s.quiz.index] : undefined;
}

/** Which region(s) should glow in color right now. Cached per state object. */
export function getEmphasis(s: AppState): Emphasis {
  if (s === lastState) return lastEmphasis;
  const ids = new Set<string>();
  if (s.view === "explore" || s.view === "tour") {
    if (s.focusedId) ids.add(s.focusedId);
    if (s.hoveredId) ids.add(s.hoveredId);
  } else if (s.view === "quiz") {
    const q = currentQuizItem(s);
    if (q?.kind === "identify") ids.add(q.regionId);
    else if (q?.kind === "find") {
      if (s.quiz.picked) ids.add(q.regionId);
      else if (s.hoveredId) ids.add(s.hoveredId);
    }
  }
  let deep = false;
  ids.forEach((id) => {
    if (getRegion(id)?.deep) deep = true;
  });
  lastState = s;
  lastEmphasis = { ids, any: ids.size > 0, deep };
  return lastEmphasis;
}

/** The region the camera should fly to (null = home view). */
export function cameraTargetId(s: AppState): string | null {
  if (s.view === "explore" || s.view === "tour") return s.focusedId;
  if (s.view === "quiz") {
    const q = currentQuizItem(s);
    if (q?.kind === "identify") return q.regionId;
    if (q?.kind === "find" && s.quiz.picked) return q.regionId;
  }
  return null;
}

/** Hover labels would give away quiz answers. */
export function hoverLabelsAllowed(s: AppState): boolean {
  return s.view === "explore" || s.view === "tour";
}

/** Whether pointing at the brain should pick regions at all. */
export function pickingEnabled(s: AppState): boolean {
  if (s.view === "explore" || s.view === "tour") return true;
  if (s.view === "quiz") {
    const q = currentQuizItem(s);
    return q?.kind === "find" && !s.quiz.picked;
  }
  return false;
}
