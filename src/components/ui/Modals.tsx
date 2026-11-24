"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { HABITS, SOURCES } from "@/lib/content";
import { useApp } from "@/lib/store";
import { IconCheck, IconClose, IconExternal } from "./icons";

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      // Keep Tab inside the dialog.
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="glass flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl !bg-[rgba(8,14,28,0.96)] sm:rounded-3xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 border-b border-sky-400/15 px-6 pt-5 pb-4">
          <h2 id="dialog-title" className="flex-1 text-2xl font-extrabold text-white sm:text-3xl">
            {title}
          </h2>
          <button type="button" data-autofocus className="btn btn-ghost h-11 w-11 rounded-xl" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-6 py-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export function Modals() {
  const modal = useApp((s) => s.modal);
  const openModal = useApp((s) => s.openModal);
  const close = () => openModal(null);
  return (
    <AnimatePresence>
      {modal === "habits" && (
        <Dialog key="habits" title={HABITS.title} onClose={close}>
          <p className="text-lg text-sky-100/90">{HABITS.intro}</p>
          <ul className="mt-4 space-y-3">
            {HABITS.tips.map((t) => (
              <li key={t} className="flex gap-3 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] p-4">
                <IconCheck className="mt-0.5 shrink-0 text-emerald-300" width={22} height={22} />
                <span className="text-[18px] leading-relaxed text-sky-50">{t}</span>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {modal === "sources" && (
        <Dialog key="sources" title="Sources" onClose={close}>
          <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-[17px] text-amber-50">{SOURCES.note}</p>
          <ul className="mt-4 space-y-3">
            {SOURCES.list.map((src) => (
              <li key={src.url}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 hover:border-sky-300/50 hover:bg-sky-400/10"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold tracking-wide text-sky-300 uppercase">
                      {src.publisher}
                      {src.kind ? ` · ${src.kind}` : ""}
                    </span>
                    <span className="mt-0.5 block text-lg font-semibold text-white group-hover:underline">{src.title}</span>
                    <span className="mt-0.5 block truncate text-sm text-sky-200/70">{src.url}</span>
                  </span>
                  <IconExternal className="mt-1 shrink-0 text-sky-300" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
