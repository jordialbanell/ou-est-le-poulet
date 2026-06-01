import { useMemo, useState } from "react";
import {
  CHALLENGES,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  type Challenge,
  type Difficulty,
} from "../lib/data";
import { pushChallenge, submitForApproval } from "../lib/actions";
import { playChime } from "../lib/sound";
import type { ChallengeCompletion, PendingChallenge } from "../lib/types";

const FILTERS: { id: "all" | Difficulty; label: string }[] = [
  { id: "all", label: "All" },
  { id: "easy", label: "Easy (1pt)" },
  { id: "medium", label: "Medium (2pt)" },
  { id: "hard", label: "Hard (3pt)" },
  { id: "bonus", label: "Bonus" },
];

type CardStatus = "completed" | "pending" | "rejected" | "open";

export function ChallengesTab({
  gameId,
  teamId,
  teamName,
  completions,
  pending,
}: {
  gameId: string;
  teamId: string;
  teamName: string;
  completions: ChallengeCompletion[];
  pending: PendingChallenge[];
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pushedNote, setPushedNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Difficulty>("all");

  // "team" challenges only appear under All (no dedicated filter pill).
  const visibleDiffs = filter === "all" ? DIFFICULTY_ORDER : [filter];

  // challenge name -> this team's approved completion row
  const myCompletions = useMemo(() => {
    const map = new Map<string, ChallengeCompletion>();
    for (const c of completions) if (c.team_id === teamId) map.set(c.challenge_name, c);
    return map;
  }, [completions, teamId]);

  // challenge id -> this team's most recent submission
  const myPending = useMemo(() => {
    const map = new Map<string, PendingChallenge>();
    for (const p of pending) {
      if (p.team_id !== teamId) continue;
      const prev = map.get(p.challenge_id);
      if (!prev || p.submitted_at > prev.submitted_at) map.set(p.challenge_id, p);
    }
    return map;
  }, [pending, teamId]);

  const totalPoints = useMemo(
    () =>
      completions
        .filter((c) => c.team_id === teamId)
        .reduce((sum, c) => sum + c.points, 0),
    [completions, teamId],
  );

  function statusFor(ch: Challenge): CardStatus {
    const latest = myPending.get(ch.id);
    if (myCompletions.has(ch.name) || latest?.status === "approved") return "completed";
    if (latest?.status === "pending") return "pending";
    if (latest?.status === "rejected") return "rejected";
    return "open";
  }

  async function submit(ch: Challenge) {
    if (busy.has(ch.id)) return;
    setError(null);
    setBusy((s) => new Set(s).add(ch.id));
    try {
      await submitForApproval(gameId, teamId, {
        challengeId: ch.id,
        challengeName: ch.name,
        points: ch.points,
        difficulty: ch.difficulty,
      });
      playChime();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit challenge.");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(ch.id);
        return n;
      });
    }
  }

  async function challengeATeam(ch: Challenge) {
    setError(null);
    try {
      await pushChallenge(
        gameId,
        `⚔️ ${teamName} challenges you: ${ch.name} — ${ch.description}`,
        ch.points,
      );
      setPushedNote(`Sent "${ch.name}" to all teams!`);
      setTimeout(() => setPushedNote(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send challenge.");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      {/* Sticky points total + filter pills */}
      <div className="sticky top-0 z-10 -mx-4 border-b-2 border-black/10 bg-[var(--color-paper)]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold">Challenges</h2>
          <div className="text-right">
            <span className="font-display text-3xl font-extrabold text-[var(--color-gold)]">
              {totalPoints}
            </span>
            <span className="ml-1 text-sm font-bold opacity-50">pts</span>
          </div>
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`font-display min-h-[36px] shrink-0 whitespace-nowrap rounded-full border-2 px-4 text-sm font-bold transition active:scale-95 ${
                  active
                    ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white shadow-md shadow-[var(--color-gold)]/30"
                    : "border-black/15 bg-white/50 text-ink"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="-mt-1 text-sm opacity-60">
        Submit a challenge and the Chicken approves it before points land.
      </p>

      {error && (
        <p className="rounded-xl bg-[var(--color-alert)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-alert)]">
          {error}
        </p>
      )}
      {pushedNote && (
        <p className="animate-pop rounded-xl bg-green-600/15 px-4 py-2 text-sm font-semibold text-green-700">
          {pushedNote}
        </p>
      )}

      {visibleDiffs.map((diff) => {
        const meta = DIFFICULTY_META[diff];
        const items = CHALLENGES.filter((c) => c.difficulty === diff);
        return (
          <section key={diff} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <h3 className="font-display text-lg font-bold" style={{ color: meta.accent }}>
                {meta.label}
              </h3>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: meta.accent }}
              >
                {meta.badge}
              </span>
            </div>

            {items.map((ch) => {
              const status = statusFor(ch);
              const isBusy = busy.has(ch.id);
              const done = status === "completed";
              return (
                <div
                  key={ch.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    done
                      ? "border-transparent bg-black/5 opacity-60"
                      : status === "pending"
                        ? "border-[var(--color-gold)]/60 bg-[var(--color-gold)]/5"
                        : status === "rejected"
                          ? "border-[var(--color-alert)]/50 bg-[var(--color-alert)]/5"
                          : "border-black/10 bg-white/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-display font-bold ${done ? "line-through" : ""}`}>
                          {ch.name}
                        </p>
                        <EvidenceIcon ch={ch} />
                        {status === "rejected" && (
                          <span className="rounded-md bg-[var(--color-alert)]/15 px-1.5 py-0.5 text-xs font-bold text-[var(--color-alert)]">
                            ✕ rejected
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-snug opacity-70">{ch.description}</p>
                    </div>
                    <span
                      className="font-display shrink-0 rounded-xl px-2.5 py-1 text-sm font-extrabold text-white"
                      style={{ backgroundColor: meta.accent }}
                    >
                      +{ch.points}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <SubmitButton
                      status={status}
                      points={ch.points}
                      busy={isBusy}
                      onSubmit={() => submit(ch)}
                    />
                    {diff === "team" && status !== "completed" && (
                      <button
                        onClick={() => challengeATeam(ch)}
                        className="font-display min-h-[44px] rounded-xl bg-[#6A1B9A] px-3 text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98]"
                      >
                        ⚔️ Challenge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function SubmitButton({
  status,
  points,
  busy,
  onSubmit,
}: {
  status: CardStatus;
  points: number;
  busy: boolean;
  onSubmit: () => void;
}) {
  if (status === "completed") {
    return (
      <div className="font-display flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 text-sm font-bold uppercase tracking-wide text-white">
        ✓ Approved (+{points})
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="font-display flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-black/10 text-sm font-bold uppercase tracking-wide text-ink/70">
        ⏳ Waiting for Chicken approval…
      </div>
    );
  }
  // open or rejected → can (re)submit
  return (
    <button
      onClick={onSubmit}
      disabled={busy}
      className="font-display min-h-[44px] flex-1 rounded-xl bg-[var(--color-gold)] text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
    >
      {busy ? "Submitting…" : status === "rejected" ? "Submit again" : "Submit for approval"}
    </button>
  );
}

function EvidenceIcon({ ch }: { ch: Challenge }) {
  if (ch.requiresVideo)
    return (
      <span className="rounded-md bg-[var(--color-alert)]/15 px-1.5 py-0.5 text-xs font-bold text-[var(--color-alert)]">
        🎥 video
      </span>
    );
  if (ch.requiresPhoto)
    return (
      <span className="rounded-md bg-[var(--color-zone-a)]/15 px-1.5 py-0.5 text-xs font-bold text-[var(--color-zone-a)]">
        📷 photo
      </span>
    );
  return null;
}
