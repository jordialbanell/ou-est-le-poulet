import { useState } from "react";
import { submitForApproval } from "../lib/actions";
import { playChime } from "../lib/sound";
import type { PushedChallenge } from "../lib/types";
import { MediaUpload } from "./MediaUpload";
import { useDeadline } from "./common";

export function PushedChallengeToast({
  push,
  gameId,
  teamId,
  onLater,
  onDismiss,
}: {
  push: PushedChallenge;
  gameId: string;
  teamId: string;
  onLater: (push: PushedChallenge) => void;
  onDismiss: () => void;
}) {
  const [evidence, setEvidence] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deadline = useDeadline(push.deadline);

  async function accept() {
    if (!evidence) {
      setError("📸 Evidence required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Submit for the Chicken's approval — points are never self-awarded.
      await submitForApproval(gameId, teamId, {
        challengeId: `pushed:${push.id}`,
        challengeName: push.challenge_text,
        points: push.points,
        difficulty: "bonus",
        evidenceUrl: evidence,
      });
      playChime();
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit challenge.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="absolute inset-0 bg-black/40" onClick={() => onLater(push)} />
      <div className="animate-slide-down relative w-full max-w-sm rounded-3xl border-4 border-[var(--color-gold)] bg-[var(--color-paper)] p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍗</span>
          <p className="font-display text-sm font-extrabold uppercase tracking-widest text-[var(--color-gold)]">
            New Challenge from the Chicken
          </p>
        </div>
        <p className="font-display mt-3 text-xl font-bold leading-snug">{push.challenge_text}</p>
        {push.points > 0 ? (
          <p className="mt-2 font-bold text-[var(--color-gold)]">+{push.points} points</p>
        ) : (
          <p className="mt-2 text-sm font-bold uppercase tracking-wide opacity-50">Announcement · no points</p>
        )}

        {push.deadline && deadline && (
          <div
            className={`mt-3 rounded-2xl border-2 px-3 py-2 text-center ${
              deadline.up
                ? "border-[var(--color-alert)] bg-[var(--color-alert)]/15"
                : "border-[var(--color-alert)]/40 bg-[var(--color-alert)]/5"
            }`}
          >
            <p className="font-display text-sm font-extrabold text-[var(--color-alert)]">
              {deadline.up
                ? "⏰ Time's up!"
                : `⏰ Complete by ${push.deadline} or points will be deducted.`}
            </p>
            {!deadline.up && (
              <p className="font-display mt-0.5 text-lg font-extrabold tabular-nums">{deadline.label}</p>
            )}
          </div>
        )}

        <div className="mt-3">
          <MediaUpload value={evidence} onUploaded={setEvidence} compact label="Add photo / video" />
        </div>

        {error && (
          <p className="mt-3 text-sm font-semibold text-[var(--color-alert)]">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={accept}
            disabled={busy}
            className="font-display min-h-[48px] flex-1 rounded-2xl bg-[var(--color-gold)] text-sm font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Submitting…" : push.points > 0 ? `Submit (+${push.points})` : "Submit"}
          </button>
          <button
            onClick={() => onLater(push)}
            className="font-display min-h-[48px] rounded-2xl border-2 border-black/15 px-4 text-sm font-bold uppercase tracking-wide transition active:scale-[0.98]"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
