import { computeLeaderboard } from "../lib/scoring";
import type { BarCheckin, ChallengeCompletion, Team } from "../lib/types";
import { ZonePills } from "./common";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardTab({
  teams,
  checkins,
  completions,
  currentTeamId,
}: {
  teams: Team[];
  checkins: BarCheckin[];
  completions: ChallengeCompletion[];
  currentTeamId: string;
}) {
  const rows = computeLeaderboard(teams, checkins, completions);

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4">
      <h2 className="font-display text-2xl font-extrabold">Leaderboard</h2>
      <p className="-mt-1 text-sm opacity-60">Live standings · {teams.length} team{teams.length === 1 ? "" : "s"}</p>

      {rows.length === 0 && (
        <p className="rounded-2xl border-2 border-black/10 bg-white/50 p-6 text-center opacity-60">
          No teams yet.
        </p>
      )}

      {rows.map((row) => {
        const isMe = row.team.id === currentTeamId;
        return (
          <div
            key={row.team.id}
            className={`flex items-center gap-3 rounded-2xl border-2 p-4 transition ${
              isMe
                ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 shadow-md"
                : "border-black/10 bg-white/50"
            }`}
          >
            <div className="font-display w-9 shrink-0 text-center text-xl font-extrabold">
              {row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: row.team.color }}
                />
                <p className="font-display truncate font-bold">
                  {row.team.name}
                  {isMe && <span className="ml-1 text-xs font-bold text-[var(--color-gold)]">(you)</span>}
                </p>
                {row.canSitDown && <span title="Can sit down">🍗</span>}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <ZonePills visited={row.zonesVisited} size="sm" />
                <span className="text-xs font-semibold opacity-60">
                  {row.barCount} bar{row.barCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-display text-3xl font-extrabold leading-none">{row.totalPoints}</p>
              <p className="text-xs font-bold uppercase opacity-50">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
