import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { findGameByCode, findTeamByCode, joinTeam } from "../lib/actions";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useTeam } from "../hooks/useTeam";
import type { Game, Team } from "../lib/types";
import { MediaUpload } from "./MediaUpload";

type Mode = "choose" | "create" | "join";

const inputCls =
  "w-full rounded-2xl border-2 border-black/15 bg-[var(--color-paper)] px-4 py-3 text-base font-semibold outline-none transition focus:border-[var(--color-gold)]";

export function JoinScreen() {
  const navigate = useNavigate();
  const { setTeam } = useTeam();
  const [params] = useSearchParams();

  const [code, setCode] = useState(params.get("code") ?? "");
  const [mode, setMode] = useState<Mode>("choose");

  // Create flow
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Join flow
  const [teamCode, setTeamCode] = useState("");
  const [foundTeam, setFoundTeam] = useState<Team | null>(null);
  const [foundGame, setFoundGame] = useState<Game | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameCodeValid = /^\d{4}$/.test(code.trim());

  function goMode(next: Mode) {
    setError(null);
    if (!gameCodeValid) {
      setError("Game code must be 4 digits.");
      return;
    }
    if (!supabaseConfigured) {
      setError("Backend not configured — add Supabase keys to .env.");
      return;
    }
    setMode(next);
  }

  function backToChoose() {
    setError(null);
    setFoundTeam(null);
    setMode("choose");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Give your team a name.");
      return;
    }
    setBusy(true);
    try {
      const game = await findGameByCode(code.trim());
      if (!game) {
        setError(`No game found with code ${code.trim()}.`);
        return;
      }
      const { count } = await supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("game_id", game.id);

      const team = await joinTeam(game.id, cleanName, count ?? 0, {
        members,
        selfie_url: selfieUrl,
      });
      setTeam({
        teamId: team.id,
        gameId: game.id,
        teamName: team.name,
        gameCode: game.code,
      });
      // Show the shareable code before heading into the game.
      setCreatedCode(team.team_code ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create team. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onFindTeam(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = teamCode.trim().toUpperCase();
    if (clean.length !== 6) {
      setError("Team code is 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const game = await findGameByCode(code.trim());
      if (!game) {
        setError(`No game found with code ${code.trim()}.`);
        return;
      }
      const team = await findTeamByCode(game.id, clean);
      if (!team) {
        setError("No team found with that code.");
        return;
      }
      setFoundGame(game);
      setFoundTeam(team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not look up team. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function confirmJoin() {
    if (!foundTeam || !foundGame) return;
    setTeam({
      teamId: foundTeam.id,
      gameId: foundGame.id,
      teamName: foundTeam.name,
      gameCode: foundGame.code,
    });
    navigate("/play");
  }

  // ── Share screen after creating a team ──────────────────────────
  if (createdCode !== null) {
    return <TeamCreated code={createdCode} onContinue={() => navigate("/play")} />;
  }

  return (
    <div className="safe-top flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-8 text-center">
          <div className="mb-3 text-6xl">🍗</div>
          <h1 className="font-display text-4xl font-extrabold leading-none tracking-tight">
            OÙ EST
            <br />
            LE POULET
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-[var(--color-gold)]">
            Find the Chicken
          </p>
        </div>

        <div className="rounded-3xl border-2 border-black/10 bg-white/60 p-5 shadow-xl shadow-black/5 backdrop-blur">
          {mode === "choose" && (
            <>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
                Game Code
              </label>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError(null);
                }}
                inputMode="numeric"
                pattern="\d*"
                placeholder="0000"
                autoComplete="off"
                className="font-display w-full rounded-2xl border-2 border-black/15 bg-[var(--color-paper)] px-4 py-4 text-center text-4xl font-bold tracking-[0.4em] outline-none transition focus:border-[var(--color-gold)]"
              />
              <p className="mb-4 mt-1 text-center text-xs opacity-50">
                4 digits. Try not to lose these too.
              </p>

              {error && <ErrorNote>{error}</ErrorNote>}

              <button
                onClick={() => goMode("create")}
                className="font-display mb-3 min-h-[56px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-[var(--color-gold)]/30 transition active:scale-[0.98]"
              >
                Create a Team
              </button>
              <button
                onClick={() => goMode("join")}
                className="font-display min-h-[56px] w-full rounded-2xl border-2 border-black/20 bg-[var(--color-paper)] text-lg font-extrabold uppercase tracking-wide transition active:scale-[0.98]"
              >
                Join Existing Team
              </button>
            </>
          )}

          {mode === "create" && (
            <form onSubmit={onCreate}>
              <GameBadge code={code} onChange={backToChoose} />

              <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
                Team Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                placeholder="Something your mates won't regret"
                autoFocus
                className={`${inputCls} mb-4`}
              />

              <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
                Team Members
              </label>
              <input
                value={members}
                onChange={(e) => setMembers(e.target.value.slice(0, 200))}
                placeholder="The people who showed up"
                className={`${inputCls} mb-4`}
              />

              <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
                Team Selfie
              </label>
              <div className="mb-5">
                <MediaUpload
                  value={selfieUrl}
                  onUploaded={setSelfieUrl}
                  accept="image/*"
                  label="Take / upload selfie"
                />
              </div>

              {error && <ErrorNote>{error}</ErrorNote>}

              <button
                type="submit"
                disabled={busy}
                className="font-display min-h-[56px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-[var(--color-gold)]/30 transition active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create Team"}
              </button>
            </form>
          )}

          {mode === "join" && !foundTeam && (
            <form onSubmit={onFindTeam}>
              <GameBadge code={code} onChange={backToChoose} />

              <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
                Enter your team code
              </label>
              <input
                value={teamCode}
                onChange={(e) => {
                  setTeamCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6));
                  setError(null);
                }}
                placeholder="CLUCK4"
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                className="font-display mb-2 w-full rounded-2xl border-2 border-black/15 bg-[var(--color-paper)] px-4 py-4 text-center text-3xl font-bold tracking-[0.3em] outline-none transition focus:border-[var(--color-gold)]"
              />
              <p className="mb-4 text-center text-xs opacity-50">
                6 characters. Ask your team captain.
              </p>

              {error && <ErrorNote>{error}</ErrorNote>}

              <button
                type="submit"
                disabled={busy}
                className="font-display min-h-[56px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-[var(--color-gold)]/30 transition active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Looking…" : "Find Team"}
              </button>
              <button
                type="button"
                onClick={backToChoose}
                className="mt-3 w-full text-sm font-semibold underline opacity-60"
              >
                Back
              </button>
            </form>
          )}

          {mode === "join" && foundTeam && (
            <div>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide opacity-60">
                Is this your team?
              </p>
              <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-black/10 bg-[var(--color-paper)] p-4">
                {foundTeam.selfie_url && (
                  <img
                    src={foundTeam.selfie_url}
                    alt={`${foundTeam.name} selfie`}
                    className="h-14 w-14 shrink-0 rounded-xl border-2 object-cover"
                    style={{ borderColor: foundTeam.color }}
                  />
                )}
                <div className="min-w-0">
                  <p className="font-display truncate text-xl font-extrabold" style={{ color: foundTeam.color }}>
                    {foundTeam.name}
                  </p>
                  {foundTeam.members && (
                    <p className="truncate text-sm font-semibold opacity-60">{foundTeam.members}</p>
                  )}
                </div>
              </div>

              <button
                onClick={confirmJoin}
                className="font-display min-h-[56px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-[var(--color-gold)]/30 transition active:scale-[0.98]"
              >
                Join {foundTeam.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFoundTeam(null);
                  setError(null);
                }}
                className="mt-3 w-full text-sm font-semibold underline opacity-60"
              >
                Search again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Big shareable "your team code is …" screen shown right after creating. */
function TeamCreated({ code, onContinue }: { code: string; onContinue: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard?.writeText(code);
    setCopied(true);
  }
  return (
    <div className="safe-top flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-4 text-6xl">🎉</div>
        <h1 className="font-display text-2xl font-extrabold">Your team is ready!</h1>
        <p className="mt-2 text-sm font-semibold opacity-60">
          Share this code so your teammates join the same team.
        </p>

        <div className="my-6 rounded-3xl border-4 border-[var(--color-gold)] bg-[var(--color-gold)]/10 p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
            Your team code
          </p>
          <p className="font-display mt-1 text-5xl font-extrabold tracking-[0.2em]">{code}</p>
        </div>

        <button
          onClick={copy}
          className="font-display mb-3 min-h-[52px] w-full rounded-2xl border-2 border-black/20 bg-[var(--color-paper)] text-base font-extrabold uppercase tracking-wide transition active:scale-[0.98]"
        >
          {copied ? "Copied! ✓" : "Copy code"}
        </button>
        <button
          onClick={onContinue}
          className="font-display min-h-[56px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-[var(--color-gold)]/30 transition active:scale-[0.98]"
        >
          Let's go 🍗
        </button>
      </div>
    </div>
  );
}

function GameBadge({ code, onChange }: { code: string; onChange: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-black/10 bg-[var(--color-paper)] px-3 py-2">
      <span className="text-sm font-bold opacity-70">Game #{code}</span>
      <button
        type="button"
        onClick={onChange}
        className="text-xs font-bold uppercase tracking-wide text-[var(--color-gold)]"
      >
        Change
      </button>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 rounded-xl bg-[var(--color-alert)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-alert)]">
      {children}
    </p>
  );
}
