import { useState } from "react";
import { POINTS_TO_WIN } from "../lib/data";
import { computeWinStatus, MANDATORY_DRINK_BARS } from "../lib/scoring";
import type { BarCheckin, ChallengeCompletion, Team } from "../lib/types";
import { PointsCounter, ProgressBar, ZonePills } from "./common";
import { RulesModal } from "./RulesModal";
import { EditTeamModal } from "./EditTeamModal";

export function Dashboard({
  team,
  teamId,
  teamName,
  teamColor,
  checkins,
  completions,
  chickenLocation,
  onRenamed,
}: {
  team: Team | null;
  teamId: string;
  teamName: string;
  teamColor: string;
  checkins: BarCheckin[];
  completions: ChallengeCompletion[];
  chickenLocation: string | null;
  onRenamed: (name: string) => void;
}) {
  const status = computeWinStatus(teamId, checkins, completions);
  const [showRules, setShowRules] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      {/* Team header */}
      <div className="animate-rise flex items-center gap-3">
        {team?.selfie_url && (
          <img
            src={team.selfie_url}
            alt={`${teamName} selfie`}
            className="h-16 w-16 shrink-0 rounded-2xl border-2 object-cover"
            style={{ borderColor: teamColor }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Your Team</p>
          <h2
            className="font-display truncate text-3xl font-extrabold leading-tight"
            style={{ color: teamColor }}
          >
            {teamName}
          </h2>
          {team?.members && <p className="truncate text-sm font-semibold opacity-60">{team.members}</p>}
        </div>
        <button
          onClick={() => setShowEdit(true)}
          disabled={!team}
          className="font-display shrink-0 rounded-xl border-2 border-black/15 px-3 py-2 text-xs font-bold uppercase disabled:opacity-40"
        >
          Edit
        </button>
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

      {/* Rules & win conditions */}
      <button
        onClick={() => setShowRules(true)}
        className={`font-display min-h-[72px] w-full rounded-3xl text-xl font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98] ${
          status.canSitDown ? "animate-glow-gold bg-[var(--color-gold)]" : "bg-[var(--color-gold)]"
        }`}
      >
        {status.canSitDown ? "🍗 You can sit down — see rules" : "📜 View Rules & Win Conditions"}
      </button>

      {showRules && <RulesModal status={status} onClose={() => setShowRules(false)} />}
      {showEdit && team && (
        <EditTeamModal team={team} onClose={() => setShowEdit(false)} onSaved={onRenamed} />
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
