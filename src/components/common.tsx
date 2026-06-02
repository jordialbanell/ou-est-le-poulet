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

/** Pill refresh button used on Home + Admin. */
export function RefreshButton({
  onRefresh,
  label,
}: {
  onRefresh: () => Promise<void> | void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={go}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-full border-2 border-black/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition active:scale-95 disabled:opacity-50"
    >
      <span className={busy ? "inline-block animate-spin" : "inline-block"}>↻</span>
      {label}
    </button>
  );
}

/** Parse a same-night "HH:MM" deadline into today's Date (null if malformed). */
function deadlineToDate(hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

function formatLeft(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return `${h}h ${mins % 60}m left`;
  }
  if (mins >= 1) return `${mins} min${mins === 1 ? "" : "s"} left`;
  return `${secs}s left`;
}

/**
 * Live countdown to a same-night "HH:MM" deadline. Ticks every second.
 * Returns `null` when there's no (valid) deadline.
 */
export function useDeadline(deadline: string | null): { up: boolean; label: string } | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const target = deadlineToDate(deadline);
  if (!target) return null;
  const msLeft = target.getTime() - now;
  const up = msLeft <= 0;
  return { up, label: up ? "Time's up!" : formatLeft(msLeft) };
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 opacity-70">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-black/15 border-t-[var(--color-gold)]" />
      {label && <p className="text-sm font-semibold">{label}</p>}
    </div>
  );
}
