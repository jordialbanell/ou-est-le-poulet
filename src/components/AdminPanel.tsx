import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useGame } from "../hooks/useGame";
import { createGame, findGameByCode, pushChallenge, revealChicken } from "../lib/actions";
import { supabaseConfigured } from "../lib/supabase";
import { computeLeaderboard } from "../lib/scoring";
import { ZonePills, Spinner, LiveDot } from "./common";

export function AdminPanel() {
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
  const [location, setLocation] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [pushText, setPushText] = useState("");
  const [pushPoints, setPushPoints] = useState(2);
  const [pushing, setPushing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
      flash("Chicken location revealed to all teams! 🍗");
    } finally {
      setRevealing(false);
    }
  }

  async function onPush(e: FormEvent) {
    e.preventDefault();
    if (!pushText.trim()) return;
    setPushing(true);
    try {
      await pushChallenge(gameId, pushText.trim(), pushPoints);
      setPushText("");
      flash("Challenge pushed to all teams!");
    } finally {
      setPushing(false);
    }
  }

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-10 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">🍗 Chicken Admin</h1>
          <p className="text-sm opacity-60">Game #{code} · {state.teams.length} teams</p>
        </div>
        <LiveDot connected={state.connected} />
      </div>

      {note && (
        <p className="animate-pop rounded-xl bg-green-600/15 px-4 py-2 text-sm font-semibold text-green-700">
          {note}
        </p>
      )}

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
              flash("Link copied!");
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
            placeholder="e.g. Molly Malone's, Zone C"
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
          <textarea
            value={pushText}
            onChange={(e) => setPushText(e.target.value)}
            placeholder="e.g. Buy the bar staff a round!"
            rows={2}
            className="w-full resize-none rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold opacity-60">Points</label>
            <select
              value={pushPoints}
              onChange={(e) => setPushPoints(Number(e.target.value))}
              className="rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2 font-bold"
            >
              {[1, 2, 3, 4, 5, 8].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              disabled={pushing}
              className="font-display ml-auto rounded-xl bg-[#6A1B9A] px-4 py-2 font-bold uppercase text-white disabled:opacity-60"
            >
              Push to all
            </button>
          </div>
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
        {rows.length === 0 && <p className="text-sm opacity-60">No teams yet.</p>}
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.team.id}
              className="flex items-center gap-3 rounded-xl border-2 border-black/10 bg-[var(--color-paper)] p-3"
            >
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
          ))}
        </div>
      </Card>
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
        placeholder="Existing code"
        className="min-w-0 flex-1 rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2 text-center font-bold tracking-widest"
      />
      <button className="font-display rounded-xl border-2 border-black/15 px-4 py-2 font-bold">
        Open
      </button>
    </form>
  );
}
