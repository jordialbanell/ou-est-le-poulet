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

export interface TeamProfile {
  members?: string | null;
  selfie_url?: string | null;
}

// Unambiguous alphabet — no 0/O or 1/I so codes are easy to read aloud / type.
const TEAM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a random 6-char shareable team code (e.g. "CLUCK4"). */
export function makeTeamCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += TEAM_CODE_ALPHABET[Math.floor(Math.random() * TEAM_CODE_ALPHABET.length)];
  }
  return s;
}

export async function joinTeam(
  gameId: string,
  name: string,
  existingTeamCount: number,
  profile: TeamProfile = {},
): Promise<Team> {
  const color = TEAM_COLORS[existingTeamCount % TEAM_COLORS.length];
  // Retry on the (rare) team_code unique collision — it's the only unique
  // constraint on teams besides the primary key.
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase
      .from("teams")
      .insert({
        game_id: gameId,
        name: name.trim(),
        color,
        members: profile.members?.trim() || null,
        selfie_url: profile.selfie_url || null,
        team_code: makeTeamCode(),
      })
      .select()
      .single();
    if (!error && data) return data;
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Could not generate a unique team code. Try again.");
}

/** Look up a team by its shareable code within a game (case-insensitive). */
export async function findTeamByCode(
  gameId: string,
  teamCode: string,
): Promise<Team | null> {
  const { data, error } = await supabase
    .from("teams")
    .select()
    .eq("game_id", gameId)
    .eq("team_code", teamCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTeam(
  teamId: string,
  fields: { name?: string; members?: string | null; selfie_url?: string | null },
): Promise<Team> {
  const patch: Record<string, string | null> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.members !== undefined) patch.members = fields.members?.trim() || null;
  if (fields.selfie_url !== undefined) patch.selfie_url = fields.selfie_url || null;
  const { data, error } = await supabase
    .from("teams")
    .update(patch)
    .eq("id", teamId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin: show/hide a single team's live pin on the player + admin maps. */
export async function setTeamLocationVisible(teamId: string, visible: boolean) {
  const { error } = await supabase
    .from("teams")
    .update({ location_visible: visible })
    .eq("id", teamId);
  if (error) throw error;
}

/** Admin: show/hide every team's live pin at once. */
export async function setAllTeamsLocationVisible(teamIds: string[], visible: boolean) {
  if (teamIds.length === 0) return;
  const { error } = await supabase
    .from("teams")
    .update({ location_visible: visible })
    .in("id", teamIds);
  if (error) throw error;
}

export async function checkInBar(
  gameId: string,
  teamId: string,
  barName: string,
  zone: Zone,
  evidenceUrl?: string | null,
  note?: string | null,
) {
  const { data, error } = await supabase
    .from("bar_checkins")
    .insert({
      game_id: gameId,
      team_id: teamId,
      bar_name: barName,
      zone,
      checkin_evidence_url: evidenceUrl || null,
      checkin_note: note?.trim() || null,
    })
    .select()
    .single();
  if (error) {
    console.error("[OELP] check-in insert failed", { barName, zone, error });
    throw new Error(error.message || "Check-in failed.");
  }
  console.debug("[OELP] checked in", barName, data?.id);
  return data;
}

export async function undoCheckIn(checkinId: string) {
  const { error } = await supabase.from("bar_checkins").delete().eq("id", checkinId);
  if (error) {
    console.error("[OELP] undo check-in failed", { checkinId, error });
    throw new Error(error.message || "Could not undo check-in.");
  }
  console.debug("[OELP] undid check-in", checkinId);
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
  evidenceUrl?: string | null;
  description?: string | null;
  messageToChicken?: string | null;
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
    evidence_url: challenge.evidenceUrl || null,
    description: challenge.description?.trim() || null,
    message_to_chicken: challenge.messageToChicken?.trim() || null,
  });
  if (error) throw error;
}

/** Attach/replace evidence on a still-pending submission. */
export async function updatePendingEvidence(pendingId: string, evidenceUrl: string | null) {
  const { error } = await supabase
    .from("pending_challenges")
    .update({ evidence_url: evidenceUrl })
    .eq("id", pendingId);
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

export async function rejectPending(pendingId: string, reason?: string | null) {
  const { error } = await supabase
    .from("pending_challenges")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason?.trim() || null,
    })
    .eq("id", pendingId);
  if (error) throw error;
}

export async function removeCompletion(completionId: string) {
  const { error } = await supabase
    .from("challenge_completions")
    .delete()
    .eq("id", completionId);
  if (error) throw error;
}

export async function updateCompletionPoints(completionId: string, points: number) {
  const { error } = await supabase
    .from("challenge_completions")
    .update({ points })
    .eq("id", completionId);
  if (error) throw error;
}

/**
 * Penalise a team by writing a negative `challenge_completions` row.
 * The reason becomes the challenge_name so it reads cleanly in the breakdown.
 */
export async function deductPoints(
  gameId: string,
  teamId: string,
  points: number,
  reason: string,
) {
  const amount = -Math.abs(points);
  const { error } = await supabase.from("challenge_completions").insert({
    game_id: gameId,
    team_id: teamId,
    challenge_name: reason.trim() || "Points deducted",
    points: amount,
    difficulty: "deduction",
  });
  if (error) throw error;
}

/** Deduct the same penalty from every team in the game at once. */
export async function deductPointsFromAll(
  gameId: string,
  teamIds: string[],
  points: number,
  reason: string,
) {
  const amount = -Math.abs(points);
  const name = reason.trim() || "Points deducted";
  const rows = teamIds.map((teamId) => ({
    game_id: gameId,
    team_id: teamId,
    challenge_name: name,
    points: amount,
    difficulty: "deduction",
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("challenge_completions").insert(rows);
  if (error) throw error;
}

export async function pushChallenge(
  gameId: string,
  challengeText: string,
  points: number,
  deadline?: string | null,
) {
  const { error } = await supabase.from("pushed_challenges").insert({
    game_id: gameId,
    challenge_text: challengeText,
    points,
    deadline: deadline?.trim() || null,
  });
  if (error) throw error;
}

export async function sendMessage(
  gameId: string,
  teamId: string,
  sender: string,
  content: string,
  isChicken: boolean,
) {
  const { error } = await supabase.from("messages").insert({
    game_id: gameId,
    team_id: teamId,
    sender,
    content: content.trim(),
    is_chicken: isChicken,
  });
  if (error) {
    console.error("[OELP] send message failed", error);
    throw new Error(error.message || "Could not send message.");
  }
}

/** Team opened its chat — persist the read marker so unread survives a reload. */
export async function markTeamRead(teamId: string) {
  const { error } = await supabase
    .from("teams")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", teamId);
  if (error) throw error;
}

/** Admin opened a team's thread — persist their per-team read marker. */
export async function markAdminRead(gameId: string, teamId: string) {
  const { error } = await supabase
    .from("admin_read_receipts")
    .upsert(
      { game_id: gameId, team_id: teamId, last_read_at: new Date().toISOString() },
      { onConflict: "game_id,team_id" },
    );
  if (error) throw error;
}

export async function revealChicken(gameId: string, location: string) {
  const { error } = await supabase
    .from("games")
    .update({ chicken_location: location })
    .eq("id", gameId);
  if (error) throw error;
}

// ── Live GPS ────────────────────────────────────────────────────
// One row per team, kept fresh. We track the row id locally and update it;
// the first fix inserts (or reuses an existing row for the team).

export async function upsertTeamLocation(
  gameId: string,
  teamId: string,
  lat: number,
  lng: number,
  knownRowId: string | null,
): Promise<string> {
  if (knownRowId) {
    const { error } = await supabase
      .from("team_locations")
      .update({ lat, lng, updated_at: new Date().toISOString() })
      .eq("id", knownRowId);
    if (error) throw error;
    return knownRowId;
  }

  // No known row yet — reuse one if this team already has it, else insert.
  const { data: existing } = await supabase
    .from("team_locations")
    .select("id")
    .eq("team_id", teamId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("team_locations")
      .update({ lat, lng, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("team_locations")
    .insert({ game_id: gameId, team_id: teamId, lat, lng })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
