"use client";

import { useEffect, useRef } from "react";
import { REGIONS, getRegion, isNetwork } from "@/lib/content";
import { useLayout } from "@/lib/layout";
import { currentQuizItem, useApp } from "@/lib/store";
import { ColorDot } from "./ColorDot";
import { IconCheck, IconClose, IconRight, IconX } from "./icons";

function resultMessage(score: number, total: number) {
  const pct = total ? score / total : 0;
  if (pct === 1) return "Perfect score! Your prefrontal cortex is proud.";
  if (pct >= 0.7) return "Great job! You know your brain regions.";
  if (pct >= 0.4) return "Nice work. Try the guided tour, then test yourself again.";
  return "Good start! Take the guided tour and try again.";
}

export function QuizPanel() {
  const s = useApp();
  const L = useLayout();
  const q = currentQuizItem(s);
  const { items, index, score, picked, finished } = s.quiz;
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard focus to "Next" after answering, and to the question after advancing.
  useEffect(() => {
    if (picked) nextRef.current?.focus();
  }, [picked]);
  useEffect(() => {
    headingRef.current?.focus();
  }, [index, finished]);

  const header = (
    <div className="flex items-center gap-3 border-b border-sky-400/15 px-5 pt-4 pb-3">
      <div className="flex-1">
        <p className="text-sm font-bold tracking-wider text-sky-300 uppercase">Test yourself</p>
        {!finished && (
          <p className="text-base font-semibold text-sky-100">
            Question {index + 1} of {items.length} · Score {score}
          </p>
        )}
      </div>
      <button type="button" onClick={s.startExplore} className="btn btn-ghost h-11 w-11 rounded-xl" aria-label="Exit quiz">
        <IconClose />
      </button>
    </div>
  );

  if (finished || !q) {
    const total = items.length;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
          {total === 0 ? (
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-white outline-none">
              No quiz questions are set up yet.
            </h2>
          ) : (
            <>
              <h2 ref={headingRef} tabIndex={-1} className="text-5xl font-extrabold text-white outline-none">
                {score} <span className="text-2xl font-bold text-sky-200/80">out of {total}</span>
              </h2>
              <p className="max-w-sm text-xl leading-relaxed text-sky-50" aria-live="polite">
                {resultMessage(score, total)}
              </p>
            </>
          )}
          <div className="mt-2 flex w-full max-w-sm flex-col gap-2.5">
            <button type="button" className="btn btn-primary py-4 text-lg" onClick={s.startQuiz}>
              Try again
            </button>
            <button type="button" className="btn btn-ghost py-3.5 text-base" onClick={() => s.startTour(0)}>
              Start guided tour
            </button>
            <button type="button" className="btn btn-ghost py-3.5 text-base" onClick={s.startExplore}>
              Explore the brain
            </button>
          </div>
        </div>
      </div>
    );
  }

  const correct = getRegion(q.regionId)!;
  const pickedRegion = getRegion(picked);
  const wasRight = picked === q.regionId;
  const choices = REGIONS.filter((r) => !isNetwork(r) && (!s.pickable || s.pickable.includes(r.id)));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <h2 ref={headingRef} tabIndex={-1} className="text-[26px] leading-snug font-extrabold text-white outline-none lg:text-[28px]">
          {q.prompt}
        </h2>
        <p className="mt-2 text-[17px] text-sky-200/85">
          {q.kind === "identify"
            ? "Look for the region glowing in color on the brain."
            : L.desktop
              ? "Click the region on the brain, or pick it from the list on the left."
              : "Tap the region on the brain, or choose from the list below."}
        </p>

        {q.kind === "identify" && (
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {q.options.map((id) => {
              const r = getRegion(id)!;
              const isCorrect = id === q.regionId;
              const isPicked = id === picked;
              const state = !picked ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "other";
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!!picked}
                  onClick={() => s.answerQuiz(id)}
                  className={`btn min-h-[60px] justify-start rounded-xl border px-4 py-3 text-left text-[17px] ${
                    state === "correct"
                      ? "border-emerald-300/70 bg-emerald-400/20 text-white"
                      : state === "wrong"
                        ? "border-rose-300/70 bg-rose-400/20 text-white"
                        : state === "other"
                          ? "border-white/10 bg-white/5 text-sky-100/60"
                          : "btn-ghost"
                  }`}
                  style={picked ? { opacity: 1 } : undefined}
                >
                  {state === "correct" && <IconCheck className="shrink-0 text-emerald-300" />}
                  {state === "wrong" && <IconX className="shrink-0 text-rose-300" />}
                  <span>{r.name}</span>
                  {state === "correct" && <span className="sr-only">(correct answer)</span>}
                  {state === "wrong" && <span className="sr-only">(your answer)</span>}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "find" && !picked && !L.desktop && (
          <details className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/5">
            <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-sky-100">Choose from the list</summary>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {choices.map((r) => (
                <button key={r.id} type="button" className="btn btn-ghost justify-start px-4 py-3 text-base" onClick={() => s.answerQuiz(r.id)}>
                  {r.name}
                </button>
              ))}
            </div>
          </details>
        )}

        {picked && (
          <div
            className={`mt-5 rounded-xl border p-4 ${wasRight ? "border-emerald-300/40 bg-emerald-400/10" : "border-rose-300/40 bg-rose-400/10"}`}
            role="status"
            aria-live="assertive"
          >
            <p className="flex items-center gap-2 text-xl font-bold text-white">
              {wasRight ? <IconCheck className="text-emerald-300" /> : <IconX className="text-rose-300" />}
              {wasRight ? "Correct!" : "Not quite."}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[17px] text-sky-50">
              <ColorDot color={correct.color} />
              <span>
                {q.kind === "find" && !wasRight && pickedRegion ? `You picked the ${pickedRegion.name}. ` : ""}
                It&apos;s the <strong>{correct.name}</strong>.
              </span>
            </p>
            <p className="mt-2 text-[17px] leading-relaxed text-sky-100/90">{correct.whatItDoes}</p>
          </div>
        )}
      </div>
      {picked && (
        <div className="shrink-0 border-t border-sky-400/15 p-3">
          <button ref={nextRef} type="button" className="btn btn-primary w-full py-4 text-lg" onClick={s.nextQuestion}>
            {index + 1 >= items.length ? "See my score" : "Next question"} <IconRight />
          </button>
        </div>
      )}
    </div>
  );
}
