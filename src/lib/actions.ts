import { supabase } from "./supabase";
import { TEAM_COLORS, type Difficulty, type Zone } from "./data";
import type { Game, PendingChallenge, Team } from "./types";

/** Generate a random 4-digit game code as a string (e.g. "4269"). */
export function makeGameCode(): string {
  // 1000–9999 so it's always 4 digits.
  const n = 1000 + Math.floor(Math.random() * 9000);
  return String(n);
}

export async function createGame(): Promise<Game> {
  // Try a few codes in case of a unique collision.
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeGameCode();
    const { data, error } = await supabase
      .from("games")
      .insert({ code })
      .select()
      .single();
    if (!error && data) return data;
    // 23505 = unique_violation → retry with a new code.
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Could not generate a unique game code. Try again.");
}

export async function findGameByCode(code: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select()
    .eq("code", code.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function joinTeam(
  gameId: string,
  name: string,
  existingTeamCount: number,
): Promise<Team> {
  const color = TEAM_COLORS[existingTeamCount % TEAM_COLORS.length];
  const { data, error } = await supabase
    .from("teams")
    .insert({ game_id: gameId, name: name.trim(), color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function checkInBar(
  gameId: string,
  teamId: string,
  barName: string,
  zone: Zone,
) {
  const { error } = await supabase.from("bar_checkins").insert({
    game_id: gameId,
    team_id: teamId,
    bar_name: barName,
    zone,
  });
  if (error) throw error;
}

export async function undoCheckIn(checkinId: string) {
  const { error } = await supabase.from("bar_checkins").delete().eq("id", checkinId);
  if (error) throw error;
}

export async function completeChallenge(
  gameId: string,
  teamId: string,
  challengeName: string,
  points: number,
  difficulty: Difficulty,
) {
  const { error } = await supabase.from("challenge_completions").insert({
    game_id: gameId,
    team_id: teamId,
    challenge_name: challengeName,
    points,
    difficulty,
  });
  if (error) throw error;
}

// ── Approval flow ───────────────────────────────────────────────
// Teams submit here; only the Chicken (admin) can turn a submission into points.

export interface SubmissionInput {
  challengeId: string;
  challengeName: string;
  points: number;
  difficulty: Difficulty;
}

export async function submitForApproval(
  gameId: string,
  teamId: string,
  challenge: SubmissionInput,
) {
  const { error } = await supabase.from("pending_challenges").insert({
    game_id: gameId,
    team_id: teamId,
    challenge_id: challenge.challengeId,
    challenge_name: challenge.challengeName,
    points: challenge.points,
    difficulty: challenge.difficulty,
    status: "pending",
  });
  if (error) throw error;
}

export async function approvePending(pending: PendingChallenge) {
  // Award the points first; only mark approved if that succeeds.
  await completeChallenge(
    pending.game_id,
    pending.team_id,
    pending.challenge_name,
    pending.points,
    pending.difficulty,
  );
  const { error } = await supabase
    .from("pending_challenges")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", pending.id);
  if (error) throw error;
}

export async function rejectPending(pendingId: string) {
  const { error } = await supabase
    .from("pending_challenges")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", pendingId);
  if (error) throw error;
}

export async function pushChallenge(
  gameId: string,
  challengeText: string,
  points: number,
) {
  const { error } = await supabase.from("pushed_challenges").insert({
    game_id: gameId,
    challenge_text: challengeText,
    points,
  });
  if (error) throw error;
}

export async function revealChicken(gameId: string, location: string) {
  const { error } = await supabase
    .from("games")
    .update({ chicken_location: location })
    .eq("id", gameId);
  if (error) throw error;
}
