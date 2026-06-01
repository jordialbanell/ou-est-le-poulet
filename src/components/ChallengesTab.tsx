import { useMemo, useState } from "react";
import {
  CHALLENGES,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  type Challenge,
  type Difficulty,
} from "../lib/data";
import { completeChallenge, pushChallenge, undoChallenge } from "../lib/actions";
import { playChime } from "../lib/sound";
import type { ChallengeCompletion } from "../lib/types";

const FILTERS: { id: "all" | Difficulty; label: string }[] = [
  { id: "all", label: "All" },
  { id: "easy", label: "Easy (1pt)" },
  { id: "medium", label: "Medium (2pt)" },
  { id: "hard", label: "Hard (3pt)" },
  { id: "bonus", label: "Bonus" },
];

export function ChallengesTab({
  gameId,
  teamId,
  teamName,
  completions,
}: {
  gameId: string;
  teamId: string;
  teamName: string;
  completions: ChallengeCompletion[];
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pushedNote, setPushedNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Difficulty>("all");

  // "team" challenges only appear under All (no dedicated filter pill).
  const visibleDiffs = filter === "all" ? DIFFICULTY_ORDER : [filter];

  // challenge name -> this team's completion row
  const myCompletions = useMemo(() => {
    const map = new Map<string, ChallengeCompletion>();
    for (const c of completions) if (c.team_id === teamId) map.set(c.challenge_name, c);
    return map;
  }, [completions, teamId]);

  const totalPoints = useMemo(
    () =>
      completions
        .filter((c) => c.team_id === teamId)
        .reduce((sum, c) => sum + c.points, 0),
    [completions, teamId],
  );

  async function toggle(ch: Challenge) {
    if (busy.has(ch.id)) return;
    setError(null);
    setBusy((s) => new Set(s).add(ch.id));
    try {
      const existing = myCompletions.get(ch.name);
      if (existing) {
        await undoChallenge(existing.id);
      } else {
        await completeChallenge(gameId, teamId, ch.name, ch.points, ch.difficulty);
        playChime();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update challenge.");
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
              const done = myCompletions.has(ch.name);
              const isBusy = busy.has(ch.id);
              return (
                <div
                  key={ch.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    done ? "border-transparent bg-black/5 opacity-60" : "border-black/10 bg-white/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-display font-bold ${done ? "line-through" : ""}`}
                        >
                          {ch.name}
                        </p>
                        <EvidenceIcon ch={ch} />
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
                    <button
                      onClick={() => toggle(ch)}
                      disabled={isBusy}
                      className={`font-display min-h-[44px] flex-1 rounded-xl text-sm font-bold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-50 ${
                        done
                          ? "bg-black/10 text-ink"
                          : "bg-[var(--color-gold)] text-white"
                      }`}
                    >
                      {done ? "✓ Done — tap to undo" : `Mark complete (+${ch.points})`}
                    </button>
                    {diff === "team" && (
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
