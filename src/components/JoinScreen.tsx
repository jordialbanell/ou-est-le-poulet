import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { findGameByCode, joinTeam } from "../lib/actions";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useTeam } from "../hooks/useTeam";
import { MediaUpload } from "./MediaUpload";

export function JoinScreen() {
  const navigate = useNavigate();
  const { setTeam } = useTeam();
  const [params] = useSearchParams();

  const [code, setCode] = useState(params.get("code") ?? "");
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim();
    const cleanName = name.trim();
    if (cleanCode.length !== 4 || !/^\d{4}$/.test(cleanCode)) {
      setError("Game code must be 4 digits.");
      return;
    }
    if (!cleanName) {
      setError("Give your team a name.");
      return;
    }
    if (!supabaseConfigured) {
      setError("Backend not configured — add Supabase keys to .env.");
      return;
    }

    setBusy(true);
    try {
      const game = await findGameByCode(cleanCode);
      if (!game) {
        setError(`No game found with code ${cleanCode}.`);
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
      navigate("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join. Try again.");
    } finally {
      setBusy(false);
    }
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

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border-2 border-black/10 bg-white/60 p-5 shadow-xl shadow-black/5 backdrop-blur"
        >
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
            Game Code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            pattern="\d*"
            placeholder="0000"
            autoComplete="off"
            className="font-display w-full rounded-2xl border-2 border-black/15 bg-[var(--color-paper)] px-4 py-4 text-center text-4xl font-bold tracking-[0.4em] outline-none transition focus:border-[var(--color-gold)]"
          />
          <p className="mb-4 mt-1 text-center text-xs opacity-50">
            4 digits. Try not to lose these too.
          </p>

          <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
            Team Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="Something your mates won't regret"
            className="mb-4 w-full rounded-2xl border-2 border-black/15 bg-[var(--color-paper)] px-4 py-4 text-lg font-semibold outline-none transition focus:border-[var(--color-gold)]"
          />

          <label className="mb-1 block text-xs font-bold uppercase tracking-wide opacity-60">
            Team Members
          </label>
          <input
            value={members}
            onChange={(e) => setMembers(e.target.value.slice(0, 200))}
            placeholder="The people who showed up"
            className="mb-4 w-full rounded-2xl border-2 border-black/15 bg-[var(--color-paper)] px-4 py-3 text-base font-semibold outline-none transition focus:border-[var(--color-gold)]"
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

          {error && (
            <p className="mb-4 rounded-xl bg-[var(--color-alert)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-alert)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="font-display min-h-[56px] w-full rounded-2xl bg-[var(--color-gold)] text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-[var(--color-gold)]/30 transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Joining…" : "Join the Hunt"}
          </button>
        </form>
      </div>
    </div>
  );
}
