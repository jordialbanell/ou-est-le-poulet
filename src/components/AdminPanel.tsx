import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useGame } from "../hooks/useGame";
import {
  approveBarCheckin,
  approvePending,
  createGame,
  deductPoints,
  deductPointsFromAll,
  findGameByCode,
  markAdminRead,
  pushChallenge,
  rejectBarCheckin,
  rejectPending,
  removeCompletion,
  revealChicken,
  sendMessage,
  updateCompletionPoints,
} from "../lib/actions";
import { supabaseConfigured } from "../lib/supabase";
import { isVideoUrl } from "../lib/cloudinary";
import { evidenceByChallengeName } from "../lib/evidence";
import { computeLeaderboard } from "../lib/scoring";
import { ZonePills, Spinner, LiveDot, RefreshButton } from "./common";
import { ChatThread } from "./ChatThread";
import { AdminMap } from "./AdminMap";
import { Gallery } from "./Gallery";
import { useToast } from "./Toast";
import type {
  AdminReadReceipt,
  BarCheckin,
  ChallengeCompletion,
  Message,
  PendingChallenge,
  Team,
} from "../lib/types";

const ADMIN_PASSWORD = "Poulet2026!";
const ADMIN_SESSION_KEY = "oelp.admin";

export function AdminPanel() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === "ok",
  );
  if (!authed) return <AdminGate onUnlock={() => setAuthed(true)} />;
  return <AdminPanelInner />;
}

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "ok");
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <div className="safe-top flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="font-display text-2xl font-extrabold">Chicken Admin</h1>
      <p className="text-sm opacity-60">Enter the admin password.</p>
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          placeholder="The secret cluck"
          autoFocus
          className="w-full rounded-2xl border-2 border-black/15 bg-[var(--color-paper)] px-4 py-3 text-center text-lg font-semibold outline-none focus:border-[var(--color-gold)]"
        />
        {error && (
          <p className="text-sm font-semibold text-[var(--color-alert)]">Wrong password.</p>
        )}
        <button className="font-display min-h-[52px] rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase text-white">
          Unlock
        </button>
      </form>
    </div>
  );
}

function AdminPanelInner() {
  const [params, setParams] = useSearchParams();
  const code = params.get("code") ?? "";

  const [gameId, setGameId] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [creating, setCreating] = useState(false);

  // Resolve game id from the code in the URL.
  useEffect(() => {
    if (!code || !supabaseConfigured) {
      setGameId(null);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    setLookupError(null);
    findGameByCode(code)
      .then((game) => {
        if (cancelled) return;
        if (game) setGameId(game.id);
        else {
          setGameId(null);
          setLookupError(`No game with code ${code}.`);
        }
      })
      .catch((e) => !cancelled && setLookupError(e.message))
      .finally(() => !cancelled && setLookingUp(false));
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onCreate() {
    setCreating(true);
    setLookupError(null);
    try {
      const game = await createGame();
      setParams({ code: game.code });
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Could not create game.");
    } finally {
      setCreating(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <Centered>
        <p className="font-display text-xl font-bold">Backend not configured</p>
        <p className="text-sm opacity-70">Add Supabase keys to <code>.env</code> and reload.</p>
      </Centered>
    );
  }

  // No game selected → create / enter code screen.
  if (!gameId) {
    return (
      <Centered>
        <div className="text-5xl">🍗</div>
        <h1 className="font-display text-2xl font-extrabold">Chicken Admin</h1>
        {lookingUp && <Spinner label="Finding game…" />}
        {lookupError && <p className="text-sm font-semibold text-[var(--color-alert)]">{lookupError}</p>}

        <button
          onClick={onCreate}
          disabled={creating}
          className="font-display min-h-[56px] w-full max-w-xs rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase text-white disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create New Game"}
        </button>

        <CodeEntry onSubmit={(c) => setParams({ code: c })} />
      </Centered>
    );
  }

  return <AdminDashboard gameId={gameId} code={code} />;
}

function AdminDashboard({ gameId, code }: { gameId: string; code: string }) {
  const state = useGame(gameId);
  const toast = useToast();
  const [location, setLocation] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [pushText, setPushText] = useState("");
  const [pushPoints, setPushPoints] = useState(2);
  const [pushDeadline, setPushDeadline] = useState("");
  const [pushing, setPushing] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [deductTeam, setDeductTeam] = useState<string | null>(null);
  const [deductAllOpen, setDeductAllOpen] = useState(false);

  useEffect(() => {
    setLocation(state.game?.chicken_location ?? "");
  }, [state.game?.chicken_location]);

  const rows = computeLeaderboard(state.teams, state.checkins, state.completions);
  const joinUrl = `${window.location.origin}/?code=${code}`;

  async function onReveal(e: FormEvent) {
    e.preventDefault();
    if (!location.trim()) return;
    setRevealing(true);
    try {
      await revealChicken(gameId, location.trim());
      toast("Chicken location revealed to all teams! 🍗", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not reveal location.", "error");
    } finally {
      setRevealing(false);
    }
  }

  async function onPush(e: FormEvent) {
    e.preventDefault();
    if (!pushText.trim()) return;
    setPushing(true);
    try {
      await pushChallenge(gameId, pushText.trim(), pushPoints, pushDeadline || null);
      setPushText("");
      setPushDeadline("");
      toast("✅ Challenge pushed to all teams!", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not push challenge.", "error");
    } finally {
      setPushing(false);
    }
  }

  async function onDeduct(teamId: string, points: number, reason: string) {
    await deductPoints(gameId, teamId, points, reason);
    // Re-fetch scores so the leaderboard + totals update instantly.
    await state.refreshCompletions();
    const name = state.teams.find((t) => t.id === teamId)?.name ?? "team";
    toast(`−${points} from ${name}`, "success");
    setDeductTeam(null);
  }

  async function onDeductAll(points: number, reason: string) {
    await deductPointsFromAll(gameId, state.teams.map((t) => t.id), points, reason);
    await state.refreshCompletions();
    toast(`−${points} from all ${state.teams.length} teams`, "success");
    setDeductAllOpen(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-10 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">🍗 Chicken Admin</h1>
          <p className="text-sm opacity-60">Game #{code} · {state.teams.length} teams</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton onRefresh={state.refresh} label="Refresh" />
          <LiveDot connected={state.connected} />
        </div>
      </div>

      {/* Approval queue */}
      <ApprovalQueue
        gameId={gameId}
        pending={state.pendingChallenges}
        teams={state.teams}
        onRefresh={state.refreshPending}
      />

      {/* First-6 bar check-in approval queue */}
      <BarApprovalQueue
        checkins={state.checkins}
        teams={state.teams}
        onRefresh={state.refreshCheckins}
      />

      {/* Team messages */}
      <AdminMessages
        gameId={gameId}
        teams={state.teams}
        messages={state.messages}
        receipts={state.adminReadReceipts}
      />

      {/* Live map — all bars + every team's live pin, with show/hide toggles */}
      <AdminMap
        teams={state.teams}
        teamLocations={state.teamLocations}
        onChanged={state.refreshTeams}
      />

      {/* Share link */}
      <Card title="Join Link">
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={joinUrl}
            className="min-w-0 flex-1 rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(joinUrl);
              toast("Link copied!", "success");
            }}
            className="font-display rounded-xl bg-[var(--color-gold)] px-3 py-2 text-sm font-bold text-white"
          >
            Copy
          </button>
        </div>
        <p className="mt-2 font-display text-4xl font-extrabold tracking-[0.3em]">{code}</p>
      </Card>

      {/* Reveal chicken */}
      <Card title="Reveal the Chicken">
        <form onSubmit={onReveal} className="flex gap-2">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="The moment of truth. No pressure."
            className="min-w-0 flex-1 rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2"
          />
          <button
            disabled={revealing}
            className="font-display rounded-xl bg-[var(--color-alert)] px-4 py-2 font-bold uppercase text-white disabled:opacity-60"
          >
            {state.game?.chicken_location ? "Update" : "Reveal"}
          </button>
        </form>
        {state.game?.chicken_location && (
          <p className="mt-2 text-sm font-semibold opacity-70">
            Currently shown: <span className="text-[var(--color-gold)]">{state.game.chicken_location}</span>
          </p>
        )}
      </Card>

      {/* Push challenge */}
      <Card title="Push a Random Challenge">
        <form onSubmit={onPush} className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wide opacity-60">
            Ruin their evening with this:
          </label>
          <textarea
            value={pushText}
            onChange={(e) => setPushText(e.target.value)}
            placeholder="Channel your inner people-pleaser"
            rows={2}
            className="w-full resize-none rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-bold opacity-60">Points</label>
            <select
              value={pushPoints}
              onChange={(e) => setPushPoints(Number(e.target.value))}
              className="rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2 font-bold"
            >
              {[0, 1, 2, 3, 4, 5, 8].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <label className="text-sm font-bold opacity-60">Deadline</label>
            <input
              type="time"
              value={pushDeadline}
              onChange={(e) => setPushDeadline(e.target.value)}
              className="rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2 font-bold"
            />
            {pushDeadline && (
              <button
                type="button"
                onClick={() => setPushDeadline("")}
                className="text-xs font-bold uppercase opacity-50"
              >
                Clear
              </button>
            )}
          </div>
          {pushPoints === 0 && (
            <p className="text-xs font-semibold opacity-50">
              0 points — this is just an announcement / task with no reward.
            </p>
          )}
          {pushDeadline && (
            <p className="text-xs font-semibold text-[var(--color-alert)]">
              ⏰ Teams see a live countdown to {pushDeadline}.
            </p>
          )}
          <button
            disabled={pushing}
            className="font-display ml-auto rounded-xl bg-[#6A1B9A] px-4 py-2 font-bold uppercase text-white disabled:opacity-60"
          >
            Push to all
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2">
          {["⚔️ Team vs Team: 1-on-1 drink race! First to finish wins.", "📸 Group selfie with the bar staff", "🎤 Karaoke now!"].map((q) => (
            <button
              key={q}
              onClick={() => setPushText(q)}
              className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold"
            >
              {q.slice(0, 24)}…
            </button>
          ))}
        </div>
      </Card>

      {/* Live team progress */}
      <Card title="Team Progress">
        {/* Penalise everyone at once */}
        {rows.length > 0 && (
          <div className="mb-3">
            {deductAllOpen ? (
              <DeductForm
                label="Deduct from ALL teams"
                onCancel={() => setDeductAllOpen(false)}
                onConfirm={onDeductAll}
              />
            ) : (
              <button
                onClick={() => {
                  setDeductAllOpen(true);
                  setDeductTeam(null);
                }}
                className="font-display w-full rounded-xl border-2 border-[var(--color-alert)]/40 bg-[var(--color-alert)]/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-alert)]"
              >
                −  Deduct from all teams
              </button>
            )}
          </div>
        )}
        {rows.length === 0 && <p className="text-sm opacity-60">No teams yet.</p>}
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const drinkPhotos = state.checkins
              .filter((c) => c.team_id === row.team.id && c.checkin_evidence_url)
              .sort((a, b) => a.checked_in_at.localeCompare(b.checked_in_at));
            return (
              <div
                key={row.team.id}
                className="rounded-xl border-2 border-black/10 bg-[var(--color-paper)] p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display w-6 text-center font-extrabold">{row.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.team.color }} />
                      <p className="font-display truncate font-bold">{row.team.name}</p>
                      {row.canSitDown && <span title="Can sit down">🍗</span>}
                    </div>
                    <div className="mt-1.5">
                      <ZonePills visited={row.zonesVisited} size="sm" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold leading-none">{row.totalPoints}</p>
                    <p className="text-[11px] font-bold opacity-50">{row.barCount} bars</p>
                  </div>
                </div>

                {drinkPhotos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {drinkPhotos.map((c) => (
                      <DrinkThumb key={c.id} url={c.checkin_evidence_url as string} barName={c.bar_name} />
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2 border-t border-black/10 pt-2">
                  <button
                    onClick={() =>
                      setExpandedTeam((id) => (id === row.team.id ? null : row.team.id))
                    }
                    className="font-display flex flex-1 items-center justify-between text-xs font-bold uppercase tracking-wide opacity-70"
                  >
                    View Points
                    <span className={`transition-transform ${expandedTeam === row.team.id ? "rotate-180" : ""}`}>⌄</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeductTeam((id) => (id === row.team.id ? null : row.team.id));
                      setDeductAllOpen(false);
                    }}
                    className="font-display rounded-lg border-2 border-[var(--color-alert)]/40 px-2 py-1 text-xs font-bold uppercase tracking-wide text-[var(--color-alert)]"
                  >
                    − Deduct
                  </button>
                </div>
                {deductTeam === row.team.id && (
                  <DeductForm
                    label={`Deduct from ${row.team.name}`}
                    onCancel={() => setDeductTeam(null)}
                    onConfirm={(points, reason) => onDeduct(row.team.id, points, reason)}
                  />
                )}
                {expandedTeam === row.team.id && (
                  <TeamPoints
                    teamId={row.team.id}
                    completions={state.completions}
                    pending={state.pendingChallenges}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* All media submitted across the game */}
      <Gallery teams={state.teams} pending={state.pendingChallenges} checkins={state.checkins} />
    </div>
  );
}

function ApprovalQueue({
  gameId,
  pending,
  teams,
  onRefresh,
}: {
  gameId: string;
  pending: PendingChallenge[];
  teams: Team[];
  onRefresh: () => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  // Optimistically hide rows we've actioned, before Realtime catches up.
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  // Submission currently showing its "reason for rejection" field.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  // Stamp "last updated" whenever the data changes (manual or realtime).
  useEffect(() => {
    setLastUpdated(Date.now());
  }, [pending]);

  // Tick once a second so the relative timestamp stays fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh();
      setLastUpdated(Date.now());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Refresh failed.", "error");
    } finally {
      setRefreshing(false);
    }
  }

  const secondsAgo = Math.max(0, Math.round((now - lastUpdated) / 1000));
  const agoLabel =
    secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;

  const queue = pending
    .filter((p) => p.status === "pending" && !removed.has(p.id))
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Unknown team";
  const teamColor = (id: string) => teams.find((t) => t.id === id)?.color ?? "#999";

  async function approve(p: PendingChallenge) {
    if (busy.has(p.id)) return;
    setBusy((s) => new Set(s).add(p.id));
    setRemoved((r) => new Set(r).add(p.id)); // optimistic remove
    try {
      await approvePending(p);
      toast(`Approved "${p.challenge_name}" (+${p.points})`, "success");
    } catch (e) {
      setRemoved((r) => {
        const n = new Set(r);
        n.delete(p.id);
        return n;
      });
      toast(e instanceof Error ? e.message : "Action failed.", "error");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  }

  async function confirmReject(p: PendingChallenge) {
    if (busy.has(p.id)) return;
    const why = reason.trim();
    setBusy((s) => new Set(s).add(p.id));
    setRemoved((r) => new Set(r).add(p.id)); // optimistic remove
    setRejectingId(null);
    setReason("");
    try {
      await rejectPending(p.id, why);
      // Tell the team why, instantly, in their chat thread.
      await sendMessage(
        gameId,
        p.team_id,
        "Chicken",
        `❌ "${p.challenge_name}" rejected${why ? `: ${why}` : "."}`,
        true,
      );
      toast(`Rejected "${p.challenge_name}"`, "success");
    } catch (e) {
      setRemoved((r) => {
        const n = new Set(r);
        n.delete(p.id);
        return n;
      });
      toast(e instanceof Error ? e.message : "Action failed.", "error");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  }

  return (
    <section className="rounded-2xl border-2 border-[var(--color-gold)]/60 bg-[var(--color-gold)]/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">
          Approval Queue
        </h2>
        {queue.length > 0 && (
          <span className="font-display flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-gold)] px-1.5 text-xs font-extrabold text-white">
            {queue.length}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh queue"
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black/15 text-sm transition active:scale-90 disabled:opacity-50"
        >
          <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>↻</span>
        </button>
        <span className="ml-auto text-xs font-semibold opacity-50">Updated {agoLabel}</span>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm opacity-60">No submissions waiting. 🍗</p>
      ) : (
        <div className="flex flex-col gap-2">
          {queue.map((p) => {
            const isBusy = busy.has(p.id);
            return (
              <div
                key={p.id}
                className="rounded-xl border-2 border-black/10 bg-[var(--color-paper)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: teamColor(p.team_id) }}
                      />
                      <p className="font-display truncate font-bold">{teamName(p.team_id)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-snug">{p.challenge_name}</p>
                  </div>
                  <span className="font-display shrink-0 rounded-lg bg-[var(--color-gold)] px-2 py-0.5 text-sm font-extrabold text-white">
                    +{p.points}
                  </span>
                </div>

                {/* What they say they did */}
                {p.description && (
                  <p className="mt-2 rounded-lg bg-black/5 px-2.5 py-1.5 text-sm">
                    <span className="font-bold opacity-60">Did: </span>
                    {p.description}
                  </p>
                )}
                {/* Message to the Chicken */}
                {p.message_to_chicken && (
                  <p className="mt-1.5 rounded-lg bg-[var(--color-gold)]/10 px-2.5 py-1.5 text-sm italic">
                    <span className="font-bold not-italic opacity-60">🐔 </span>
                    {p.message_to_chicken}
                  </p>
                )}

                {/* Evidence — watch/look before approving */}
                {p.evidence_url ? (
                  <Evidence url={p.evidence_url} />
                ) : (
                  <p className="mt-2 text-xs font-semibold opacity-50">No evidence attached.</p>
                )}

                {rejectingId === p.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value.slice(0, 200))}
                      autoFocus
                      placeholder="Reason for rejection?"
                      className="w-full rounded-xl border-2 border-[var(--color-alert)]/40 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-alert)]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setReason("");
                        }}
                        className="font-display min-h-[44px] flex-1 rounded-xl border-2 border-black/15 text-sm font-bold uppercase tracking-wide transition active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmReject(p)}
                        disabled={isBusy}
                        className="font-display min-h-[44px] flex-[2] rounded-xl bg-[var(--color-alert)] text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
                      >
                        Send &amp; Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => approve(p)}
                      disabled={isBusy}
                      className="font-display min-h-[44px] flex-1 rounded-xl bg-green-600 text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(p.id);
                        setReason("");
                      }}
                      disabled={isBusy}
                      className="font-display min-h-[44px] flex-1 rounded-xl bg-[var(--color-alert)] text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * Approval queue for the first-6 photo bar check-ins. Mirrors ApprovalQueue:
 * optimistic remove, live via the existing bar_checkins subscription. Approve
 * flips status → 'approved' (counts instantly on the player side); reject
 * deletes the row.
 */
function BarApprovalQueue({
  checkins,
  teams,
  onRefresh,
}: {
  checkins: BarCheckin[];
  teams: Team[];
  onRefresh: () => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  // Optimistically hide rows we've actioned, before Realtime catches up.
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLastUpdated(Date.now());
  }, [checkins]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh();
      setLastUpdated(Date.now());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Refresh failed.", "error");
    } finally {
      setRefreshing(false);
    }
  }

  const secondsAgo = Math.max(0, Math.round((now - lastUpdated) / 1000));
  const agoLabel =
    secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;

  const queue = checkins
    .filter((c) => c.status === "pending" && !removed.has(c.id))
    .sort((a, b) => a.checked_in_at.localeCompare(b.checked_in_at));

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Unknown team";
  const teamColor = (id: string) => teams.find((t) => t.id === id)?.color ?? "#999";

  async function approve(c: BarCheckin) {
    if (busy.has(c.id)) return;
    setBusy((s) => new Set(s).add(c.id));
    setRemoved((r) => new Set(r).add(c.id)); // optimistic remove
    try {
      await approveBarCheckin(c.id);
      toast(`Approved check-in at ${c.bar_name}`, "success");
    } catch (e) {
      setRemoved((r) => {
        const n = new Set(r);
        n.delete(c.id);
        return n;
      });
      toast(e instanceof Error ? e.message : "Action failed.", "error");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
    }
  }

  async function reject(c: BarCheckin) {
    if (busy.has(c.id)) return;
    setBusy((s) => new Set(s).add(c.id));
    setRemoved((r) => new Set(r).add(c.id)); // optimistic remove
    try {
      await rejectBarCheckin(c.id);
      toast(`Rejected check-in at ${c.bar_name}`, "success");
    } catch (e) {
      setRemoved((r) => {
        const n = new Set(r);
        n.delete(c.id);
        return n;
      });
      toast(e instanceof Error ? e.message : "Action failed.", "error");
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
    }
  }

  return (
    <section className="rounded-2xl border-2 border-[var(--color-gold)]/60 bg-[var(--color-gold)]/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-[var(--color-gold)]">
          Bar Check-in Queue
        </h2>
        {queue.length > 0 && (
          <span className="font-display flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-gold)] px-1.5 text-xs font-extrabold text-white">
            {queue.length}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh queue"
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black/15 text-sm transition active:scale-90 disabled:opacity-50"
        >
          <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>↻</span>
        </button>
        <span className="ml-auto text-xs font-semibold opacity-50">Updated {agoLabel}</span>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm opacity-60">No check-ins waiting. 🍺</p>
      ) : (
        <div className="flex flex-col gap-2">
          {queue.map((c) => {
            const isBusy = busy.has(c.id);
            return (
              <div
                key={c.id}
                className="rounded-xl border-2 border-black/10 bg-[var(--color-paper)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: teamColor(c.team_id) }}
                      />
                      <p className="font-display truncate font-bold">{teamName(c.team_id)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-snug">
                      🍺 {c.bar_name}
                      {c.checkin_note && (
                        <span className="opacity-60"> · {c.checkin_note}</span>
                      )}
                    </p>
                  </div>
                  <span className="font-display shrink-0 rounded-lg bg-[var(--color-gold)] px-2 py-0.5 text-xs font-extrabold uppercase text-white">
                    Zone {c.zone}
                  </span>
                </div>

                {/* Drink photo — look before approving */}
                {c.checkin_evidence_url ? (
                  <Evidence url={c.checkin_evidence_url} />
                ) : (
                  <p className="mt-2 text-xs font-semibold opacity-50">No photo attached.</p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => approve(c)}
                    disabled={isBusy}
                    className="font-display min-h-[44px] flex-1 rounded-xl bg-green-600 text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => reject(c)}
                    disabled={isBusy}
                    className="font-display min-h-[44px] flex-1 rounded-xl bg-[var(--color-alert)] text-sm font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AdminMessages({
  gameId,
  teams,
  messages,
  receipts,
}: {
  gameId: string;
  teams: Team[];
  messages: Message[];
  receipts: AdminReadReceipt[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  // Per-team last-read stamps. Seeded from Supabase receipts (so unread
  // survives a reload) and bumped locally the instant a thread is opened.
  const [reads, setReads] = useState<Record<string, string>>({});

  useEffect(() => {
    setReads((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const r of receipts) {
        const cur = next[r.team_id] ?? "";
        if (r.last_read_at > cur) {
          next[r.team_id] = r.last_read_at;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [receipts]);

  const unreadFor = (teamId: string) =>
    messages.filter(
      (m) => m.team_id === teamId && !m.is_chicken && m.sent_at > (reads[teamId] ?? ""),
    ).length;

  const lastAt = (teamId: string) => {
    const ms = messages.filter((m) => m.team_id === teamId);
    return ms.length ? ms[ms.length - 1].sent_at : "";
  };

  // Teams with messages or unread first, then by most recent activity.
  const ordered = useMemo(
    () =>
      [...teams].sort((a, b) => {
        const ua = unreadFor(a.id);
        const ub = unreadFor(b.id);
        if (ua !== ub) return ub - ua;
        return lastAt(b.id).localeCompare(lastAt(a.id));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teams, messages, reads],
  );

  function openThread(teamId: string) {
    const stamp = new Date().toISOString();
    setReads((r) => ({ ...r, [teamId]: stamp }));
    void markAdminRead(gameId, teamId);
    setSelected(teamId);
  }

  const selectedTeam = teams.find((t) => t.id === selected);
  const thread = selected
    ? messages
        .filter((m) => m.team_id === selected)
        .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    : [];

  return (
    <section className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
      <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-widest opacity-60">
        Messages
      </h2>

      {teams.length === 0 ? (
        <p className="text-sm opacity-60">No teams yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ordered.map((t) => {
            const unread = unreadFor(t.id);
            return (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className="flex items-center gap-3 rounded-xl border-2 border-black/10 bg-[var(--color-paper)] p-3 text-left transition active:scale-[0.99]"
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="font-display flex-1 truncate font-bold">{t.name}</span>
                {unread > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-alert)] px-1.5 text-xs font-extrabold text-white">
                    {unread}
                  </span>
                )}
                <span className="opacity-40">💬</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chat thread overlay */}
      {selected && selectedTeam && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-paper)]">
          <header className="flex items-center justify-between border-b-2 border-black/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedTeam.color }} />
              <div>
                <p className="font-display font-extrabold leading-none">{selectedTeam.name}</p>
                <p className="text-[11px] font-semibold opacity-50">Replying as the Chicken 🐔</p>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close chat"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-lg font-bold"
            >
              ✕
            </button>
          </header>
          <ChatThread
            messages={thread}
            viewerIsChicken
            onSend={(content) => sendMessage(gameId, selectedTeam.id, "Chicken", content, true)}
            emptyHint={`No messages with ${selectedTeam.name} yet.`}
          />
        </div>
      )}
    </section>
  );
}

function TeamPoints({
  teamId,
  completions,
  pending,
}: {
  teamId: string;
  completions: ChallengeCompletion[];
  pending: PendingChallenge[];
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState(0);
  // Optimistically hide rows we've removed, before Realtime catches up.
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const approved = completions
    .filter((c) => c.team_id === teamId && !removed.has(c.id))
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  const rejected = pending
    .filter((p) => p.team_id === teamId && p.status === "rejected")
    .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""));
  const evidenceMap = evidenceByChallengeName(pending, teamId);

  function withBusy(id: string, fn: () => Promise<void>) {
    if (busy.has(id)) return;
    setBusy((s) => new Set(s).add(id));
    fn()
      .catch((e) => toast(e instanceof Error ? e.message : "Action failed.", "error"))
      .finally(() =>
        setBusy((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
      );
  }

  async function remove(c: ChallengeCompletion) {
    setRemoved((r) => new Set(r).add(c.id)); // optimistic: gone from UI now
    try {
      await removeCompletion(c.id);
      toast(`Removed "${c.challenge_name}" (−${c.points})`, "success");
    } catch (e) {
      setRemoved((r) => {
        const n = new Set(r);
        n.delete(c.id);
        return n;
      });
      toast(e instanceof Error ? e.message : "Could not remove.", "error");
    }
  }
  async function saveEdit(c: ChallengeCompletion) {
    await updateCompletionPoints(c.id, editVal);
    setEditing(null);
    toast(`Updated "${c.challenge_name}" to ${editVal} pts`, "success");
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-black/10 pt-2">
      {approved.length === 0 && rejected.length === 0 && (
        <p className="text-xs opacity-50">No submissions yet.</p>
      )}

      {approved.map((c) => {
        const evidence = evidenceMap.get(c.challenge_name);
        return (
          <div key={c.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              {editing === c.id ? (
                <>
                  <input
                    type="number"
                    value={editVal}
                    onChange={(e) => setEditVal(Number(e.target.value))}
                    className="w-14 rounded-lg border-2 border-black/15 bg-white px-2 py-1 text-sm"
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.challenge_name}</span>
                  <button
                    onClick={() => withBusy(c.id, () => saveEdit(c))}
                    className="font-display rounded-lg bg-green-600 px-2 py-1 text-xs font-bold text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs font-bold opacity-60"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {c.points < 0 ? (
                    <span className="font-display w-8 shrink-0 font-extrabold text-[var(--color-alert)]">
                      −{Math.abs(c.points)}
                    </span>
                  ) : (
                    <span className="font-display w-8 shrink-0 font-extrabold text-green-700">+{c.points}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.challenge_name}</span>
                  <button
                    onClick={() => {
                      setEditing(c.id);
                      setEditVal(c.points);
                    }}
                    className="font-display rounded-lg border-2 border-black/15 px-2 py-1 text-xs font-bold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => withBusy(c.id, () => remove(c))}
                    disabled={busy.has(c.id)}
                    className="font-display rounded-lg bg-[var(--color-alert)] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            {evidence &&
              (isVideoUrl(evidence) ? (
                <video
                  src={evidence}
                  controls
                  playsInline
                  className="ml-10 max-h-44 w-[calc(100%-2.5rem)] rounded-lg border-2 border-black/10 bg-black object-contain"
                />
              ) : (
                <a href={evidence} target="_blank" rel="noopener noreferrer" className="ml-10">
                  <img
                    src={evidence}
                    alt={c.challenge_name}
                    className="h-14 w-14 rounded-lg border-2 border-black/10 object-cover"
                  />
                </a>
              ))}
          </div>
        );
      })}

      {rejected.map((p) => (
        <div key={p.id} className="flex items-start gap-2 text-sm">
          <span className="font-display w-8 shrink-0 font-extrabold text-[var(--color-alert)]">✕</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {p.challenge_name}{" "}
              <span className="text-xs font-bold uppercase text-[var(--color-alert)]">Rejected</span>
            </p>
            {p.rejection_reason && (
              <p className="text-xs italic opacity-60">“{p.rejection_reason}”</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DrinkThumb({ url, barName }: { url: string; barName: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={barName}
      className="shrink-0"
    >
      {isVideoUrl(url) ? (
        <video src={url} muted playsInline className="h-14 w-14 rounded-lg border-2 border-black/10 object-cover" />
      ) : (
        <img src={url} alt={barName} className="h-14 w-14 rounded-lg border-2 border-black/10 object-cover" />
      )}
    </a>
  );
}

function Evidence({ url }: { url: string }) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        controls
        playsInline
        className="mt-2 max-h-64 w-full rounded-lg border-2 border-black/10 bg-black object-contain"
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt="evidence"
        className="mt-2 max-h-64 w-full rounded-lg border-2 border-black/10 object-contain"
      />
    </a>
  );
}

/** Inline "deduct N points + reason" form used per-team and for all-teams. */
function DeductForm({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: (points: number, reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [points, setPoints] = useState(2);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = Math.max(1, Math.floor(points || 0));

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm(amount, reason);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not deduct points.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl border-2 border-[var(--color-alert)]/40 bg-[var(--color-alert)]/5 p-3">
      <p className="font-display text-xs font-bold uppercase tracking-wide text-[var(--color-alert)]">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold opacity-60">Points to deduct</label>
        <input
          type="number"
          min={1}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-16 rounded-lg border-2 border-black/15 bg-white px-2 py-1 text-sm font-bold"
        />
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 200))}
        autoFocus
        placeholder="Reason e.g. Missed the 19:00 photo challenge"
        className="w-full rounded-lg border-2 border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-alert)]"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="font-display min-h-[40px] flex-1 rounded-lg border-2 border-black/15 text-xs font-bold uppercase tracking-wide"
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={busy}
          className="font-display min-h-[40px] flex-[2] rounded-lg bg-[var(--color-alert)] text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {busy ? "Deducting…" : `Deduct −${amount}`}
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-black/10 bg-white/50 p-4">
      <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-widest opacity-60">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-top flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}

function CodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [c, setC] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (/^\d{4}$/.test(c)) onSubmit(c);
      }}
      className="flex w-full max-w-xs gap-2"
    >
      <input
        value={c}
        onChange={(e) => setC(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder="That code you wrote down"
        className="min-w-0 flex-1 rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2 text-center font-bold tracking-widest"
      />
      <button className="font-display rounded-xl border-2 border-black/15 px-4 py-2 font-bold">
        Open
      </button>
    </form>
  );
}
