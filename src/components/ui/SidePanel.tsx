"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { SHEET_FRACTION, useLayout } from "@/lib/layout";

/** Right-side panel on desktop, bottom sheet on phones and tablets. */
export function SidePanel({ open, panelKey, label, children }: { open: boolean; panelKey: string; label: string; children: ReactNode }) {
  const L = useLayout();
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key={L.desktop ? "side" : "sheet"}
          aria-label={label}
          className={
            L.desktop
              ? "glass pointer-events-auto absolute top-[76px] right-4 bottom-4 z-20 flex flex-col overflow-hidden rounded-2xl"
              : "glass pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-3xl border-b-0 pb-[env(safe-area-inset-bottom)]"
          }
          style={L.desktop ? { width: L.panelWidth - 32 } : { height: `${SHEET_FRACTION * 100}%` }}
          initial={L.desktop ? { x: 40, opacity: 0 } : { y: "100%" }}
          animate={L.desktop ? { x: 0, opacity: 1 } : { y: 0 }}
          exit={L.desktop ? { x: 40, opacity: 0 } : { y: "100%" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {!L.desktop && <div aria-hidden className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-sky-200/30" />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={panelKey}
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
