"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SITE } from "@/lib/content";
import { useApp } from "@/lib/store";
import { useLayout } from "@/lib/layout";
import { useWebGL } from "@/lib/webgl";
import { IconBook, IconCube, IconExpand, IconLeaf, IconMenu, IconPlay, IconQuiz, IconShrink, IconSquare, IconBrain, IconClose } from "./icons";
import { useFullscreen } from "./useFullscreen";

interface Action {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  pressed?: boolean;
}

function useActions(): Action[] {
  const s = useApp();
  const fs = useFullscreen();
  const webgl = useWebGL();
  const actions: Action[] = [];
  if (s.view === "tour") actions.push({ key: "tour", label: "End tour", icon: <IconClose />, onClick: s.resetView });
  else actions.push({ key: "tour", label: "Guided tour", icon: <IconPlay />, onClick: () => s.startTour(0) });
  if (s.view === "quiz") actions.push({ key: "quiz", label: "Exit quiz", icon: <IconClose />, onClick: s.startExplore });
  else actions.push({ key: "quiz", label: "Test yourself", icon: <IconQuiz />, onClick: s.startQuiz });
  actions.push({ key: "habits", label: "Healthy habits", icon: <IconLeaf />, onClick: () => s.openModal("habits") });
  actions.push({ key: "sources", label: "Sources", icon: <IconBook />, onClick: () => s.openModal("sources") });
  if (webgl === "yes" && !s.failed3D)
    actions.push({
      key: "2d",
      label: s.use2D ? "3D view" : "2D view",
      icon: s.use2D ? <IconCube /> : <IconSquare />,
      onClick: () => s.set2D(!s.use2D),
    });
  if (fs.supported)
    actions.push({
      key: "fs",
      label: fs.isFull ? "Exit fullscreen" : "Fullscreen",
      icon: fs.isFull ? <IconShrink /> : <IconExpand />,
      onClick: fs.toggle,
      pressed: fs.isFull,
    });
  return actions;
}

export function TopBar() {
  const goHome = useApp((s) => s.goHome);
  const { desktop } = useLayout();
  const actions = useActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    menuRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [menuOpen]);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-3 pt-3 sm:px-4">
      <button
        type="button"
        onClick={goHome}
        className="glass pointer-events-auto flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left"
        aria-label={`${SITE.title}: back to the start screen`}
      >
        <IconBrain width={24} height={24} className="text-sky-300" />
        <span className="text-lg font-bold tracking-tight text-white">{SITE.title}</span>
      </button>

      {desktop ? (
        <nav aria-label="Lesson tools" className="pointer-events-auto flex flex-wrap justify-end gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              aria-pressed={a.pressed}
              className="glass btn rounded-xl px-3 py-2.5 text-[15px] text-sky-50 hover:border-sky-300/60"
            >
              {a.icon}
              <span className={a.key === "2d" || a.key === "fs" ? "sr-only xl:not-sr-only" : ""}>{a.label}</span>
            </button>
          ))}
        </nav>
      ) : (
        <div className="pointer-events-auto relative">
          <button
            ref={buttonRef}
            type="button"
            className="glass btn rounded-xl px-3.5 py-2.5 text-base text-sky-50"
            aria-expanded={menuOpen}
            aria-controls="tools-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconMenu /> Menu
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                ref={menuRef}
                id="tools-menu"
                className="glass absolute top-full right-0 mt-2 flex w-60 flex-col gap-1 rounded-2xl p-2"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {actions.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-base text-sky-50 hover:bg-sky-400/15"
                    onClick={() => {
                      setMenuOpen(false);
                      a.onClick();
                    }}
                  >
                    {a.icon}
                    {a.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </header>
  );
}
