import { useMemo, useState } from "react";
import { POINTS_TO_WIN } from "../lib/data";
import { computeWinStatus, MANDATORY_DRINK_BARS } from "../lib/scoring";
import type { BarCheckin, ChallengeCompletion, PendingChallenge, Team } from "../lib/types";
import { PointsCounter, ProgressBar, ZonePills } from "./common";
import { RulesModal } from "./RulesModal";
import { EditTeamModal } from "./EditTeamModal";
import { useToast } from "./Toast";
import { isVideoUrl } from "../lib/cloudinary";
import { evidenceByChallengeName } from "../lib/evidence";

function timeOf(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function Dashboard({
  team,
  teamId,
  teamName,
  teamColor,
  gameCode,
  checkins,
  completions,
  pending,
  chickenLocation,
  onRenamed,
  onRefresh,
}: {
  team: Team | null;
  teamId: string;
  teamName: string;
  teamColor: string;
  gameCode: string;
  checkins: BarCheckin[];
  completions: ChallengeCompletion[];
  pending: PendingChallenge[];
  chickenLocation: string | null;
  onRenamed: (name: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const status = computeWinStatus(teamId, checkins, completions);
  const toast = useToast();
  const [showRules, setShowRules] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Re-share this team's join link mid-game. Same ?code=<game>&team=<teamCode>
  // format as the "Your team is ready!" screen. Prefer the native share sheet
  // (straight to WhatsApp); fall back to copy-to-clipboard + the existing toast.
  async function invite() {
    if (!team?.team_code) return;
    const joinUrl = `${window.location.origin}/?code=${gameCode}&team=${team.team_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: `Join ${teamName} in Où Est Le Poulet 🍗`, url: joinUrl });
      } catch {
        // Share sheet dismissed / cancelled — nothing to do.
      }
      return;
    }
    void navigator.clipboard?.writeText(joinUrl);
    toast("Link copied!", "success");
  }

  const myCompletions = useMemo(
    () =>
      completions
        .filter((c) => c.team_id === teamId)
        .sort((a, b) => a.completed_at.localeCompare(b.completed_at)),
    [completions, teamId],
  );
  const myRejected = useMemo(
    () =>
      pending
        .filter((p) => p.team_id === teamId && p.status === "rejected")
        .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? "")),
    [pending, teamId],
  );
  // challenge name -> evidence URL from this team's submission (if any).
  const evidenceByName = useMemo(
    () => evidenceByChallengeName(pending, teamId),
    [pending, teamId],
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      {/* Team header */}
      <div className="animate-rise flex items-center gap-3">
        <TeamAvatar selfieUrl={team?.selfie_url ?? null} name={teamName} color={teamColor} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Your Team</p>
          <h2
            className="font-display truncate text-3xl font-extrabold leading-tight"
            style={{ color: teamColor }}
          >
            {teamName}
          </h2>
          {team?.members && <p className="truncate text-sm font-semibold opacity-60">{team.members}</p>}
          {team?.team_code && (
            <p className="mt-0.5 text-xs font-semibold opacity-50">
              Team code: <span className="font-bold tracking-wider">{team.team_code}</span>
            </p>
          )}
          {team?.team_code && (
            <button
              onClick={invite}
              className="font-display mt-1.5 inline-flex items-center gap-1 rounded-lg border-2 border-black/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition active:scale-95"
            >
              📲 Invite with link
            </button>
          )}
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

        {/* Points breakdown */}
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="font-display mt-4 flex w-full items-center justify-between border-t border-black/10 pt-3 text-sm font-bold"
        >
          How did we earn this?
          <span className={`transition-transform ${showBreakdown ? "rotate-180" : ""}`}>⌄</span>
        </button>
        {showBreakdown && (
          <div className="mt-3 flex flex-col gap-1.5">
            {myCompletions.length === 0 && myRejected.length === 0 && (
              <p className="text-sm opacity-50">Nothing approved yet. Get out there.</p>
            )}
            {myCompletions.map((c) => {
              const evidence = evidenceByName.get(c.challenge_name);
              const isDeduction = c.points < 0;
              return (
                <div key={c.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`font-display w-9 shrink-0 font-extrabold ${
                        isDeduction ? "text-[var(--color-alert)]" : "text-green-700"
                      }`}
                    >
                      {isDeduction ? `−${Math.abs(c.points)}` : `+${c.points}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{c.challenge_name}</span>
                    <span className="shrink-0 text-xs opacity-50">{timeOf(c.completed_at)}</span>
                  </div>
                  {evidence &&
                    (isVideoUrl(evidence) ? (
                      <video
                        src={evidence}
                        controls
                        playsInline
                        className="ml-9 max-h-48 w-[calc(100%-2.25rem)] rounded-lg border-2 border-black/10 bg-black object-contain"
                      />
                    ) : (
                      <a href={evidence} target="_blank" rel="noopener noreferrer" className="ml-9">
                        <img
                          src={evidence}
                          alt={c.challenge_name}
                          className="h-16 w-16 rounded-lg border-2 border-black/10 object-cover"
                        />
                      </a>
                    ))}
                </div>
              );
            })}
            {myRejected.map((p) => (
              <div key={p.id} className="flex items-start gap-2 text-sm">
                <span className="font-display w-9 shrink-0 font-extrabold text-[var(--color-alert)]">✕</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.challenge_name}{" "}
                    <span className="text-xs font-bold uppercase text-[var(--color-alert)]">Rejected</span>
                  </p>
                  {p.rejection_reason && (
                    <p className="text-xs italic opacity-60">“{p.rejection_reason}”</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
        <EditTeamModal
          team={team}
          onClose={() => setShowEdit(false)}
          onSaved={onRenamed}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

/** ~60px circular team avatar — selfie if present, else a colour disc with the initial. */
function TeamAvatar({
  selfieUrl,
  name,
  color,
}: {
  selfieUrl: string | null;
  name: string;
  color: string;
}) {
  if (selfieUrl) {
    return (
      <img
        src={selfieUrl}
        alt={`${name} selfie`}
        className="h-[60px] w-[60px] shrink-0 rounded-full border-2 object-cover"
        style={{ borderColor: color }}
      />
    );
  }
  return (
    <div
      className="font-display flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border-2 text-2xl font-extrabold text-white"
      style={{ backgroundColor: color, borderColor: color }}
      aria-label={`${name} avatar`}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
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
