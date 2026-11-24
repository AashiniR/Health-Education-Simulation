"use client";

import { motion } from "framer-motion";
import { SITE } from "@/lib/content";
import { useApp } from "@/lib/store";
import { IconBook, IconBrain, IconLeaf, IconPlay, IconQuiz } from "./icons";

export function Landing() {
  const startExplore = useApp((s) => s.startExplore);
  const startTour = useApp((s) => s.startTour);
  const startQuiz = useApp((s) => s.startQuiz);
  const openModal = useApp((s) => s.openModal);

  return (
    <motion.section
      key="landing"
      className="pointer-events-none absolute inset-0 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      aria-labelledby="landing-title"
    >
      {/* Darken the brain a little behind the text so it stays readable. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(5,7,13,0.15) 0%, rgba(5,7,13,0.72) 75%)" }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <motion.p
          className="mb-4 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-sky-200 uppercase"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          {SITE.eyebrow}
        </motion.p>
        <motion.h1
          id="landing-title"
          className="title-glow text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-7xl lg:text-8xl"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {SITE.title}
        </motion.h1>
        <motion.p
          className="mt-5 max-w-2xl text-lg leading-relaxed text-sky-100/85 sm:text-xl"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {SITE.subtitle}
        </motion.p>

        <motion.div
          className="pointer-events-auto mt-10 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button type="button" className="btn btn-primary px-7 py-4 text-lg" onClick={startExplore}>
            <IconBrain width={24} height={24} /> Explore the brain
          </button>
          <button type="button" className="btn btn-ghost px-7 py-4 text-lg" onClick={() => startTour(0)}>
            <IconPlay width={22} height={22} /> Start guided tour
          </button>
          <button type="button" className="btn btn-ghost px-7 py-4 text-lg" onClick={startQuiz}>
            <IconQuiz width={24} height={24} /> Test yourself
          </button>
        </motion.div>

        <div className="pointer-events-auto mt-8 flex gap-6 text-base">
          <button type="button" className="flex items-center gap-2 text-sky-200/80 underline-offset-4 hover:text-white hover:underline" onClick={() => openModal("habits")}>
            <IconLeaf /> Healthy AI habits
          </button>
          <button type="button" className="flex items-center gap-2 text-sky-200/80 underline-offset-4 hover:text-white hover:underline" onClick={() => openModal("sources")}>
            <IconBook /> Sources
          </button>
        </div>
      </div>
    </motion.section>
  );
}
