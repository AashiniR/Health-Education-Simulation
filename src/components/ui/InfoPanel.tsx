"use client";

import { MODES, REGIONS, TOUR_IDS, activityLabel, getRegion, isNetwork, type RegionContent } from "@/lib/content";
import { useApp } from "@/lib/store";
import { ActivityMeter, ColorDot } from "./ColorDot";
import { IconClose, IconLeft, IconRight } from "./icons";

function Section({ title, children, tone = "plain" }: { title: string; children: React.ReactNode; tone?: "plain" | "tip" | "fact" }) {
  const toneClass =
    tone === "tip"
      ? "rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4"
      : tone === "fact"
        ? "rounded-xl border border-amber-300/25 bg-amber-300/10 p-4"
        : "";
  return (
    <section className={toneClass}>
      <h3 className={`text-sm font-bold tracking-wider uppercase ${tone === "tip" ? "text-emerald-200" : tone === "fact" ? "text-amber-200" : "text-sky-300"}`}>
        {title}
      </h3>
      <p className="mt-1.5 text-[18px] leading-relaxed text-sky-50 lg:text-[19px]">{children}</p>
    </section>
  );
}

function RegionBody({ region }: { region: RegionContent }) {
  const mode = useApp((s) => s.mode);
  const pickable = useApp((s) => s.pickable);
  const modeInfo = MODES.find((m) => m.id === mode)!;
  const level = region.activity[mode];
  const notShown = pickable && !pickable.includes(region.id);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-sky-200/80">Activity right now ({modeInfo.label})</p>
        <div className="mt-1.5">
          <ActivityMeter level={level} label={activityLabel(level)} />
        </div>
        {isNetwork(region) && <p className="mt-2 text-[15px] text-sky-200/80">Shown as the glowing lines connecting brain regions.</p>}
        {notShown && <p className="mt-2 text-[15px] text-amber-200/90">This region isn&apos;t shown on the brain model yet.</p>}
      </div>
      <Section title="What it does">{region.whatItDoes}</Section>
      <Section title="How AI use affects it">{region.aiEffect}</Section>
      {region.tryThis && (
        <Section title="Try this" tone="tip">
          {region.tryThis}
        </Section>
      )}
      {region.funFact && (
        <Section title="Fun fact" tone="fact">
          {region.funFact}
        </Section>
      )}
      {region.extraSections?.map((x, i) => (
        <Section key={`${x.heading}-${i}`} title={x.heading}>
          {x.text}
        </Section>
      ))}
    </div>
  );
}

export function InfoPanel() {
  const s = useApp();
  const region = getRegion(s.focusedId);
  if (!region) return null;
  const inTour = s.view === "tour";
  const i = REGIONS.findIndex((r) => r.id === region.id);
  const prev = REGIONS[(i - 1 + REGIONS.length) % REGIONS.length];
  const next = REGIONS[(i + 1) % REGIONS.length];
  const step = s.tourIndex + 1;
  const total = TOUR_IDS.length;
  const last = step >= total;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Big color band: easy to match when coloring the paper diagram. */}
      <div aria-hidden className="h-2.5 w-full shrink-0" style={{ background: region.color, boxShadow: `0 0 24px ${region.color}` }} />
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          {inTour && (
            <p className="mb-1 text-sm font-bold tracking-wider text-sky-300 uppercase" aria-live="polite">
              Guided tour · Step {step} of {total}
            </p>
          )}
          <h2 className="text-[28px] leading-tight font-extrabold text-white lg:text-[32px]" id="info-title">
            {region.name}
          </h2>
          {region.location && <p className="mt-0.5 text-base text-sky-200/80">{region.location}</p>}
          <p className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1.5 pr-4 pl-2">
            <ColorDot color={region.color} size={inTour ? 26 : 20} glow />
            <span className={`${inTour ? "text-lg" : "text-base"} font-semibold text-white`}>
              Color: <span style={{ color: region.color }}>{region.colorName}</span>
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={s.resetView}
          className="btn btn-ghost h-11 w-11 shrink-0 rounded-xl"
          aria-label={inTour ? "End tour and reset view" : "Close and reset view"}
        >
          <IconClose />
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <RegionBody region={region} />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-sky-400/15 p-3">
        {inTour ? (
          <>
            <button type="button" className="btn btn-ghost px-4 py-3.5 text-base" onClick={() => s.tourStep(-1)} disabled={step <= 1}>
              <IconLeft /> Back
            </button>
            <span className="flex-1 text-center text-base font-semibold text-sky-100" aria-hidden>
              {step} of {total}
            </span>
            <button type="button" className="btn btn-primary px-5 py-3.5 text-base" onClick={() => s.tourStep(1)}>
              {last ? "Finish tour" : "Next"} <IconRight />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost min-w-0 flex-1 px-3 py-3 text-[15px]" onClick={() => s.stepRegion(-1)} aria-label={`Previous region: ${prev.name}`}>
              <IconLeft className="shrink-0" /> <span className="truncate">Previous</span>
            </button>
            <button type="button" className="btn btn-ghost min-w-0 flex-1 px-3 py-3 text-[15px]" onClick={() => s.stepRegion(1)} aria-label={`Next region: ${next.name}`}>
              <span className="truncate">Next</span> <IconRight className="shrink-0" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
