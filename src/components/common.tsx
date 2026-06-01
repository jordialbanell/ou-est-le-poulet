import { useEffect, useRef, useState } from "react";
import { ZONE_ORDER, ZONES, type Zone } from "../lib/data";

/** Three zone pills (A/B/C), greyed out until visited. */
export function ZonePills({
  visited,
  size = "md",
}: {
  visited: Set<Zone>;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-base";
  return (
    <div className="flex gap-2">
      {ZONE_ORDER.map((z) => {
        const on = visited.has(z);
        return (
          <div
            key={z}
            className={`${dim} font-display flex items-center justify-center rounded-full font-bold transition-all duration-300`}
            style={
              on
                ? { backgroundColor: ZONES[z].color, color: "#fff", boxShadow: `0 4px 12px ${ZONES[z].color}66` }
                : { backgroundColor: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.35)" }
            }
            title={`${ZONES[z].label} — ${ZONES[z].description}`}
          >
            {z}
          </div>
        );
      })}
    </div>
  );
}

/** Big points number that pops when it changes. */
export function PointsCounter({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [popKey, setPopKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setPopKey((k) => k + 1);
    }
  }, [value]);
  return (
    <span key={popKey} className={`font-display inline-block animate-pop tabular-nums ${className}`}>
      {value}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color = "var(--color-gold)",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-4 w-full overflow-hidden rounded-full bg-black/10">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** Connection status dot for the header. */
export function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span
        className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-black/25"}`}
        style={connected ? { boxShadow: "0 0 8px #22c55e" } : undefined}
      />
      <span className="opacity-60">{connected ? "LIVE" : "…"}</span>
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 opacity-70">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-black/15 border-t-[var(--color-gold)]" />
      {label && <p className="text-sm font-semibold">{label}</p>}
    </div>
  );
}
