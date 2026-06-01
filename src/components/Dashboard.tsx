import { useState } from "react";
import { POINTS_TO_WIN } from "../lib/data";
import { computeWinStatus, MANDATORY_DRINK_BARS } from "../lib/scoring";
import type { BarCheckin, ChallengeCompletion } from "../lib/types";
import { PointsCounter, ProgressBar, ZonePills } from "./common";

export function Dashboard({
  teamId,
  teamName,
  teamColor,
  checkins,
  completions,
  chickenLocation,
}: {
  teamId: string;
  teamName: string;
  teamColor: string;
  checkins: BarCheckin[];
  completions: ChallengeCompletion[];
  chickenLocation: string | null;
}) {
  const status = computeWinStatus(teamId, checkins, completions);
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      {/* Team header */}
      <div className="animate-rise">
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Your Team</p>
        <h2
          className="font-display text-3xl font-extrabold leading-tight"
          style={{ color: teamColor }}
        >
          {teamName}
        </h2>
      </div>

      {/* Chicken reveal banner */}
      {chickenLocation && (
        <div className="animate-pop rounded-2xl border-2 border-[var(--color-gold)] bg-[var(--color-gold)]/15 p-4 text-center shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
            🍗 The Chicken is at
          </p>
          <p className="font-display mt-1 text-2xl font-extrabold">{chickenLocation}</p>
        </div>
      )}

      {/* Points + zones card */}
      <div className="rounded-3xl border-2 border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Points</p>
            <div className="flex items-baseline gap-1">
              <PointsCounter value={status.totalPoints} className="text-6xl font-extrabold" />
              <span className="font-display text-2xl font-bold opacity-30">/ {POINTS_TO_WIN}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Zones</p>
            <div className="mt-1">
              <ZonePills visited={status.zonesVisited} />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar value={status.totalPoints} max={POINTS_TO_WIN} />
          <p className="mt-2 text-sm font-semibold opacity-70">
            {status.pointsToGo > 0
              ? `${status.pointsToGo} point${status.pointsToGo === 1 ? "" : "s"} to go`
              : "Points target reached! 🎯"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Bars Visited" value={status.barCount} />
        <Stat
          label="Mandatory Drinks"
          value={`${Math.min(status.barCount, MANDATORY_DRINK_BARS)}/${MANDATORY_DRINK_BARS}`}
        />
      </div>

      {/* The big button */}
      <button
        onClick={() => setShowBreakdown((v) => !v)}
        className={`font-display min-h-[88px] w-full rounded-3xl text-2xl font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98] ${
          status.canSitDown
            ? "animate-glow-gold bg-[var(--color-gold)]"
            : "animate-pulse-alert bg-[var(--color-alert)]"
        }`}
      >
        {status.canSitDown ? "🍗 WE CAN SIT DOWN! 🍗" : "CAN WE SIT DOWN?"}
      </button>

      {showBreakdown && (
        <div className="animate-rise rounded-2xl border-2 border-black/10 bg-white/70 p-4">
          <p className="font-display mb-3 text-lg font-bold">
            {status.canSitDown ? "All conditions met 🎉" : "Still need to:"}
          </p>
          <ul className="flex flex-col gap-2">
            <Condition met={status.zonesVisited.size === 3}>
              Visit all 3 zones ({status.zonesVisited.size}/3)
            </Condition>
            <Condition met={status.totalPoints >= POINTS_TO_WIN}>
              Earn {POINTS_TO_WIN} points ({status.totalPoints}/{POINTS_TO_WIN})
            </Condition>
          </ul>
          {!status.canSitDown && (
            <div className="mt-3 border-t border-black/10 pt-3">
              {status.missingConditions.map((m) => (
                <p key={m} className="text-sm font-semibold text-[var(--color-alert)]">
                  → {m}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest opacity-50">{label}</p>
      <p className="font-display mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Condition({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          met ? "bg-green-600" : "bg-black/20"
        }`}
      >
        {met ? "✓" : "•"}
      </span>
      <span className={`font-semibold ${met ? "" : "opacity-70"}`}>{children}</span>
    </li>
  );
}
