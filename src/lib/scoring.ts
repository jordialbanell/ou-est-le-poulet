import { POINTS_TO_WIN, ZONE_ORDER, type Zone } from "./data";
import type { BarCheckin, ChallengeCompletion, Team } from "./types";

export interface WinStatus {
  zonesVisited: Set<Zone>; // need A, B, and C
  totalPoints: number; // need >= 20
  barCount: number; // informational
  canSitDown: boolean; // all conditions met
  missingConditions: string[]; // human-readable list of what's missing
  pointsToGo: number; // remaining points toward 20 (>= 0)
}

// First 6 bars of the night are "mandatory drink" bars — informational only.
export const MANDATORY_DRINK_BARS = 6;

/** Compute a single team's progress toward sitting down with the Chicken. */
export function computeWinStatus(
  teamId: string,
  checkins: BarCheckin[],
  completions: ChallengeCompletion[],
): WinStatus {
  const teamCheckins = checkins.filter((c) => c.team_id === teamId);
  const teamCompletions = completions.filter((c) => c.team_id === teamId);

  const zonesVisited = new Set<Zone>(teamCheckins.map((c) => c.zone));
  const totalPoints = teamCompletions.reduce((sum, c) => sum + c.points, 0);
  const barCount = teamCheckins.length;

  const hasAllZones = ZONE_ORDER.every((z) => zonesVisited.has(z));
  const hasPoints = totalPoints >= POINTS_TO_WIN;

  const missingConditions: string[] = [];
  const missingZones = ZONE_ORDER.filter((z) => !zonesVisited.has(z));
  if (missingZones.length > 0) {
    missingConditions.push(
      `Visit a bar in ${missingZones.map((z) => `Zone ${z}`).join(", ")}`,
    );
  }
  if (!hasPoints) {
    missingConditions.push(`Earn ${POINTS_TO_WIN - totalPoints} more point${POINTS_TO_WIN - totalPoints === 1 ? "" : "s"}`);
  }

  return {
    zonesVisited,
    totalPoints,
    barCount,
    canSitDown: hasAllZones && hasPoints,
    missingConditions,
    pointsToGo: Math.max(0, POINTS_TO_WIN - totalPoints),
  };
}

export interface LeaderboardRow {
  team: Team;
  totalPoints: number;
  zonesVisited: Set<Zone>;
  barCount: number;
  challengeCount: number;
  canSitDown: boolean;
  rank: number;
}

/** Build a ranked leaderboard for all teams in the game. */
export function computeLeaderboard(
  teams: Team[],
  checkins: BarCheckin[],
  completions: ChallengeCompletion[],
): LeaderboardRow[] {
  const rows = teams.map((team) => {
    const status = computeWinStatus(team.id, checkins, completions);
    return {
      team,
      totalPoints: status.totalPoints,
      zonesVisited: status.zonesVisited,
      barCount: status.barCount,
      challengeCount: completions.filter((c) => c.team_id === team.id).length,
      canSitDown: status.canSitDown,
      rank: 0,
    };
  });

  // Sort: can-sit-down first, then points, then zones covered, then bars, then earliest joined.
  rows.sort((a, b) => {
    if (a.canSitDown !== b.canSitDown) return a.canSitDown ? -1 : 1;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.zonesVisited.size !== a.zonesVisited.size)
      return b.zonesVisited.size - a.zonesVisited.size;
    if (b.barCount !== a.barCount) return b.barCount - a.barCount;
    return a.team.created_at.localeCompare(b.team.created_at);
  });

  // Dense-ish ranking: equal score + zones share a rank.
  rows.forEach((row, i) => {
    if (i === 0) {
      row.rank = 1;
      return;
    }
    const prev = rows[i - 1];
    const tie =
      row.canSitDown === prev.canSitDown &&
      row.totalPoints === prev.totalPoints &&
      row.zonesVisited.size === prev.zonesVisited.size &&
      row.barCount === prev.barCount;
    row.rank = tie ? prev.rank : i + 1;
  });

  return rows;
}
