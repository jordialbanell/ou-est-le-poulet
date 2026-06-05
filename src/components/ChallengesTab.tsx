import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHALLENGES,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  type Challenge,
  type Difficulty,
} from "../lib/data";
import { pushChallenge, submitForApproval, updatePendingEvidence } from "../lib/actions";
import { playChime } from "../lib/sound";
import type { ChallengeCompletion, PendingChallenge, PushedChallenge } from "../lib/types";
import { MediaUpload } from "./MediaUpload";
import { useToast } from "./Toast";
import { useDeadline } from "./common";

const FILTERS: { id: "all" | Difficulty; label: string }[] = [
  { id: "all", label: "All" },
  { id: "easy", label: "Easy (1pt)" },
  { id: "medium", label: "Medium (2pt)" },
  { id: "hard", label: "Hard (3pt)" },
  { id: "bonus", label: "Bonus" },
];

type CardStatus = "completed" | "pending" | "rejected" | "open";

interface Draft {
  evidence: string | null;
  description: string;
  message: string;
  uploading?: boolean;
  /** Team confirmed they sent the evidence to the Chicken on WhatsApp instead. */
  whatsapp?: boolean;
}
const EMPTY_DRAFT: Draft = { evidence: null, description: "", message: "" };

const requiresEvidence = (ch: Challenge) => Boolean(ch.requiresPhoto || ch.requiresVideo);

export function ChallengesTab({
  gameId,
  teamId,
  teamName,
  completions,
  pending,
  laterPushes,
  onLaterActioned,
}: {
  gameId: string;
  teamId: string;
  teamName: string;
  completions: ChallengeCompletion[];
  pending: PendingChallenge[];
  laterPushes: PushedChallenge[];
  onLaterActioned: (id: string) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | Difficulty>("all");
  const [query, setQuery] = useState("");
  // challenge id -> staged submission draft (before it's sent for approval)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const getDraft = (id: string): Draft => drafts[id] ?? EMPTY_DRAFT;
  const patchDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? EMPTY_DRAFT), ...patch } }));

  // "team" challenges only appear under All (no dedicated filter pill).
  const visibleDiffs = filter === "all" ? DIFFICULTY_ORDER : [filter];

  // Search combines with the difficulty pill: a challenge shows only if it
  // matches BOTH. Case-insensitive substring over name + description.
  const q = query.trim().toLowerCase();
  const matchesQuery = (c: Challenge) =>
    !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  const sections = visibleDiffs.map((diff) => ({
    diff,
    items: CHALLENGES.filter((c) => c.difficulty === diff && matchesQuery(c)),
  }));
  const anyMatch = sections.some((s) => s.items.length > 0);

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
    const draft = getDraft(ch.id);
    setBusy((s) => new Set(s).add(ch.id));
    try {
      await submitForApproval(gameId, teamId, {
        challengeId: ch.id,
        challengeName: ch.name,
        points: ch.points,
        difficulty: ch.difficulty,
        evidenceUrl: draft.evidence,
        description: draft.description,
        messageToChicken: draft.message,
        whatsappEvidence: draft.whatsapp,
      });
      // Drop the staged draft now that it's attached to a submission.
      setDrafts((d) => {
        const n = { ...d };
        delete n[ch.id];
        return n;
      });
      playChime();
      toast("Submitted for the Chicken 🍗", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not submit challenge.", "error");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(ch.id);
        return n;
      });
    }
  }

  async function challengeATeam(ch: Challenge) {
    try {
      await pushChallenge(
        gameId,
        `⚔️ ${teamName} challenges you: ${ch.name} — ${ch.description}`,
        ch.points,
      );
      toast(`Sent "${ch.name}" to all teams!`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not send challenge.", "error");
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
        <FilterPills value={filter} onChange={setFilter} />
      </div>

      <p className="-mt-1 text-sm opacity-60">
        Submit a challenge and the Chicken approves it before points land.
      </p>

      {/* Search — combines with the active difficulty pill. */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search challenges…"
          className="w-full rounded-xl border-2 border-black/15 bg-white/70 py-2 pl-3 pr-9 text-sm outline-none focus:border-[var(--color-gold)]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-lg opacity-50 transition active:scale-90"
          >
            ✕
          </button>
        )}
      </div>

      {/* Waiting: pushed challenges the team tapped "Later" on */}
      {filter === "all" && !q && laterPushes.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <h3 className="font-display text-lg font-bold text-[#6A1B9A]">
              📬 Challenges from the Chicken
            </h3>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#6A1B9A] px-1.5 text-xs font-extrabold text-white">
              {laterPushes.length}
            </span>
          </div>
          {laterPushes.map((p) => (
            <LaterPushCard
              key={p.id}
              push={p}
              gameId={gameId}
              teamId={teamId}
              onDone={() => onLaterActioned(p.id)}
            />
          ))}
        </section>
      )}

      {sections.map(({ diff, items }) => {
        // While searching, drop sections with no matching challenges.
        if (q && items.length === 0) return null;
        const meta = DIFFICULTY_META[diff];
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
              const draft = getDraft(ch.id);
              const pendingRow = myPending.get(ch.id);
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

                  {/* Submission form — shown when the team can (re)submit */}
                  {(status === "open" || status === "rejected") && (
                    <div className="mt-3 flex flex-col gap-2">
                      <MediaUpload
                        value={draft.evidence}
                        onUploaded={(url) => patchDraft(ch.id, { evidence: url })}
                        onBusyChange={(b) => patchDraft(ch.id, { uploading: b })}
                        compact
                        label={ch.requiresVideo ? "Add video" : "Add photo / video"}
                      />
                      {requiresEvidence(ch) && !draft.evidence && !draft.whatsapp && (
                        <p className="text-xs font-semibold text-[var(--color-alert)]">
                          {ch.requiresVideo ? "🎥 Video" : "📷 Photo"} evidence required before submitting.
                        </p>
                      )}
                      {/* Upload fallback: confirm evidence sent on WhatsApp when Cloudinary is flaky. */}
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-black/15 bg-white/70 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!draft.whatsapp}
                          onChange={(e) => patchDraft(ch.id, { whatsapp: e.target.checked })}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-gold)]"
                        />
                        <span className="text-sm font-semibold leading-snug">
                          📲 Sent photo/video to the Chicken on WhatsApp
                        </span>
                      </label>
                      <input
                        value={draft.description}
                        onChange={(e) => patchDraft(ch.id, { description: e.target.value.slice(0, 280) })}
                        placeholder="Your side of the story. Make it convincing."
                        className="w-full rounded-xl border-2 border-black/15 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--color-gold)]"
                      />
                      <input
                        value={draft.message}
                        onChange={(e) => patchDraft(ch.id, { message: e.target.value.slice(0, 280) })}
                        placeholder="Beg. It sometimes works."
                        className="w-full rounded-xl border-2 border-black/15 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--color-gold)]"
                      />
                    </div>
                  )}

                  {/* Still pending — let them attach more evidence */}
                  {status === "pending" && pendingRow && (
                    <div className="mt-3">
                      <MediaUpload
                        value={pendingRow.evidence_url}
                        onUploaded={(url) => void updatePendingEvidence(pendingRow.id, url)}
                        compact
                        label="Add more evidence"
                      />
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <SubmitButton
                      status={status}
                      points={ch.points}
                      busy={isBusy}
                      uploading={!!draft.uploading}
                      blocked={requiresEvidence(ch) && !draft.evidence && !draft.whatsapp}
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

      {q && !anyMatch && (
        <p className="py-6 text-center text-sm opacity-60">No challenges match “{query.trim()}”.</p>
      )}
    </div>
  );
}

function SubmitButton({
  status,
  points,
  busy,
  uploading = false,
  blocked = false,
  onSubmit,
}: {
  status: CardStatus;
  points: number;
  busy: boolean;
  uploading?: boolean;
  blocked?: boolean;
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
      disabled={busy || uploading || blocked}
      className="font-display min-h-[44px] flex-1 rounded-xl bg-[var(--color-gold)] text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
    >
      {uploading
        ? "Uploading…"
        : busy
          ? "Submitting…"
          : status === "rejected"
            ? "Submit again"
            : "Submit for approval"}
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

/** Horizontally scrollable filter pills with a right-edge fade + chevron hint. */
function FilterPills({
  value,
  onChange,
}: {
  value: "all" | Difficulty;
  onChange: (v: "all" | Difficulty) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setScrolled(el.scrollLeft > 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative -mx-4 mt-3">
      <div
        ref={ref}
        onScroll={update}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FILTERS.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              className={`font-display min-h-[36px] shrink-0 snap-start whitespace-nowrap rounded-full border-2 px-4 text-sm font-bold transition active:scale-95 ${
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

      {/* Right-edge fade + chevron hint while more pills are off-screen */}
      {!atEnd && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-gradient-to-l from-[var(--color-paper)] to-transparent pb-1 pr-1">
          {!scrolled && <span className="font-display text-xl font-bold opacity-50">›</span>}
        </div>
      )}
    </div>
  );
}

/** A "Later" pushed challenge waiting to be actioned (evidence mandatory). */
function LaterPushCard({
  push,
  gameId,
  teamId,
  onDone,
}: {
  push: PushedChallenge;
  gameId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [evidence, setEvidence] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deadline = useDeadline(push.deadline);

  async function submit() {
    if (!evidence) {
      setError("📸 Evidence required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitForApproval(gameId, teamId, {
        challengeId: `pushed:${push.id}`,
        challengeName: push.challenge_text,
        points: push.points,
        difficulty: "bonus",
        evidenceUrl: evidence,
      });
      playChime();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        deadline?.up
          ? "border-[var(--color-alert)] bg-[var(--color-alert)]/10"
          : "border-[#6A1B9A]/40 bg-[#6A1B9A]/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <p className="font-display min-w-0 flex-1 font-bold">{push.challenge_text}</p>
        {push.points > 0 && (
          <span className="font-display shrink-0 rounded-xl bg-[#6A1B9A] px-2.5 py-1 text-sm font-extrabold text-white">
            +{push.points}
          </span>
        )}
      </div>
      {push.deadline && deadline && (
        <p
          className={`font-display mt-2 text-sm font-extrabold ${
            deadline.up ? "text-[var(--color-alert)]" : "text-[var(--color-alert)]/80"
          }`}
        >
          {deadline.up ? "⏰ Time's up!" : `⏰ ${deadline.label} — complete by ${push.deadline}`}
        </p>
      )}
      <div className="mt-3">
        <MediaUpload value={evidence} onUploaded={setEvidence} onBusyChange={setUploading} compact label="Add photo / video" />
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-[var(--color-alert)]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={busy || uploading}
          className="font-display min-h-[44px] flex-1 rounded-xl bg-[var(--color-gold)] text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {uploading ? "Uploading…" : busy ? "Submitting…" : push.points > 0 ? `Submit (+${push.points})` : "Submit"}
        </button>
        <button
          onClick={onDone}
          className="font-display min-h-[44px] rounded-xl border-2 border-black/15 px-4 text-sm font-bold uppercase tracking-wide transition active:scale-[0.98]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
