import type { PendingChallenge } from "./types";

/**
 * Maps a team's challenge name -> the evidence URL from its submission.
 * Matches on team_id + challenge_name and picks the most recent submission
 * that actually has evidence (covers reject → resubmit → approve flows).
 */
export function evidenceByChallengeName(
  pending: PendingChallenge[],
  teamId: string,
): Map<string, string> {
  const latest = new Map<string, PendingChallenge>();
  for (const p of pending) {
    if (p.team_id !== teamId || !p.evidence_url) continue;
    const prev = latest.get(p.challenge_name);
    if (!prev || p.submitted_at > prev.submitted_at) latest.set(p.challenge_name, p);
  }
  const map = new Map<string, string>();
  latest.forEach((p, name) => {
    if (p.evidence_url) map.set(name, p.evidence_url);
  });
  return map;
}
