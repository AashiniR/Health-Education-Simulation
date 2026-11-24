/** Small color swatch. Always paired with a text label (never color alone). */
export function ColorDot({ color, size = 14, glow = false }: { color: string; size?: number; glow?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: glow ? `0 0 0 2px rgba(255,255,255,0.15), 0 0 14px ${color}` : "0 0 0 1px rgba(255,255,255,0.18)",
      }}
    />
  );
}

/** Activity meter for the current mode, with a text label. */
export function ActivityMeter({ level, label, compact = false }: { level: number; label: string; compact?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}>
      <span
        className={`relative overflow-hidden rounded-full bg-white/10 ${compact ? "h-1.5 w-12" : "h-2.5 flex-1"}`}
        aria-hidden
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#2f86ff] to-[#9ccbff] transition-[width] duration-500"
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </span>
      <span className={compact ? "w-14 text-xs text-sky-200/80" : "text-base font-semibold text-sky-100"}>{label}</span>
    </span>
  );
}
