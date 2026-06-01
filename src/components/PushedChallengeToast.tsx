import { useState } from "react";
import { submitForApproval } from "../lib/actions";
import { playChime } from "../lib/sound";
import type { PushedChallenge } from "../lib/types";

export function PushedChallengeToast({
  push,
  gameId,
  teamId,
  onDismiss,
}: {
  push: PushedChallenge;
  gameId: string;
  teamId: string;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      // Submit for the Chicken's approval — points are never self-awarded.
      await submitForApproval(gameId, teamId, {
        challengeId: `pushed:${push.id}`,
        challengeName: push.challenge_text,
        points: push.points,
        difficulty: "bonus",
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
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} />
      <div className="animate-slide-down relative w-full max-w-sm rounded-3xl border-4 border-[var(--color-gold)] bg-[var(--color-paper)] p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍗</span>
          <p className="font-display text-sm font-extrabold uppercase tracking-widest text-[var(--color-gold)]">
            New Challenge from the Chicken
          </p>
        </div>
        <p className="font-display mt-3 text-xl font-bold leading-snug">{push.challenge_text}</p>
        <p className="mt-2 font-bold text-[var(--color-gold)]">+{push.points} points</p>

        {error && (
          <p className="mt-3 text-sm font-semibold text-[var(--color-alert)]">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={accept}
            disabled={busy}
            className="font-display min-h-[48px] flex-1 rounded-2xl bg-[var(--color-gold)] text-sm font-extrabold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Submitting…" : `Submit (+${push.points})`}
          </button>
          <button
            onClick={onDismiss}
            className="font-display min-h-[48px] rounded-2xl border-2 border-black/15 px-4 text-sm font-bold uppercase tracking-wide transition active:scale-[0.98]"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
