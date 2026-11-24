"use client";

import { REGIONS, activityLabel } from "@/lib/content";
import { isPanelOpen, useLayout } from "@/lib/layout";
import { currentQuizItem, useApp, type AppState } from "@/lib/store";
import { ActivityMeter, ColorDot } from "./ColorDot";

/** In the quiz, the list is only usable for "find it" questions (and never shows the answer). */
function listState(s: AppState) {
  const q = currentQuizItem(s);
  const quiz = s.view === "quiz";
  const pickMode = quiz && q?.kind === "find" && !s.quiz.picked;
  return { quiz, pickMode, disabled: quiz && !pickMode };
}

function useRegionClick() {
  const pickRegion = useApp((s) => s.pickRegion);
  const focusRegion = useApp((s) => s.focusRegion);
  const view = useApp((s) => s.view);
  return (id: string) => (view === "quiz" ? pickRegion(id) : focusRegion(id));
}

/** Left-side list of regions on desktop: the keyboard / non-3D way to pick a region. */
export function RegionList() {
  const s = useApp();
  const L = useLayout();
  const click = useRegionClick();
  const { quiz, pickMode, disabled } = listState(s);
  if (!L.desktop) return null;

  return (
    <nav
      aria-label="Brain regions"
      className="glass pointer-events-auto absolute top-[76px] bottom-4 left-4 z-20 flex flex-col rounded-2xl"
      style={{ width: L.listWidth - 32 }}
    >
      <div className="border-b border-sky-400/15 px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold text-white">Brain regions</h2>
        <p className="mt-0.5 text-sm text-sky-200/75">
          {pickMode ? "Pick the region that matches the clue." : quiz ? "Answer in the quiz panel." : "Pick one to learn more."}
        </p>
      </div>
      <ul className="scroll-thin flex-1 space-y-1 overflow-y-auto p-2">
        {REGIONS.map((r) => {
          const focused = !quiz && s.focusedId === r.id;
          const hovered = !quiz && s.hoveredId === r.id;
          const level = r.activity[s.mode];
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => click(r.id)}
                onPointerEnter={() => !quiz && s.setHovered(r.id, "list")}
                onPointerLeave={() => !quiz && s.setHovered(null, "list")}
                onFocus={() => !quiz && s.setHovered(r.id, "list")}
                onBlur={() => !quiz && s.setHovered(null, "list")}
                aria-pressed={focused}
                aria-disabled={disabled || undefined}
                disabled={disabled}
                className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                  focused
                    ? "border-white/30 bg-white/10"
                    : hovered
                      ? "border-sky-300/30 bg-sky-400/10"
                      : "border-transparent hover:bg-sky-400/10"
                }`}
                style={focused ? { boxShadow: `inset 4px 0 0 ${r.color}` } : undefined}
              >
                <span className="mt-1">
                  <ColorDot color={r.color} glow={focused || hovered} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] leading-snug font-semibold text-white">{r.name}</span>
                  {!quiz && (
                    <span className="mt-1.5 block">
                      <span className="sr-only">Activity in this mode: </span>
                      <ActivityMeter level={level} label={activityLabel(level)} compact />
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!quiz && <p className="border-t border-sky-400/15 px-4 py-2.5 text-xs text-sky-200/65">Bars show activity in the current mode.</p>}
    </nav>
  );
}

/** Horizontal region chips on phones and tablets. */
export function RegionChips() {
  const s = useApp();
  const L = useLayout();
  const click = useRegionClick();
  const { quiz, disabled } = listState(s);
  if (L.desktop || isPanelOpen(s)) return null;
  return (
    <nav aria-label="Brain regions" className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 pb-[max(12px,env(safe-area-inset-bottom))]">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-3">
        {REGIONS.map((r) => (
          <li key={r.id} className="shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => click(r.id)}
              aria-pressed={!quiz && s.focusedId === r.id}
              className="glass flex items-center gap-2 rounded-full px-4 py-3 text-[15px] font-semibold whitespace-nowrap text-white disabled:opacity-50"
            >
              <ColorDot color={r.color} size={12} />
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
