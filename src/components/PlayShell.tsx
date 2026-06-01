import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeam } from "../hooks/useTeam";
import { useGame } from "../hooks/useGame";
import { useDarkMode } from "../hooks/useDarkMode";
import { computeWinStatus } from "../lib/scoring";
import { Dashboard } from "./Dashboard";
import { BarsTab } from "./BarsTab";
import { ChallengesTab } from "./ChallengesTab";
import { LeaderboardTab } from "./LeaderboardTab";
import { WinBanner } from "./WinBanner";
import { PushedChallengeToast } from "./PushedChallengeToast";
import { LiveDot, Spinner } from "./common";

type Tab = "home" | "bars" | "challenges" | "leaderboard";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "bars", label: "Bars", icon: "🍺" },
  { id: "challenges", label: "Tasks", icon: "🎯" },
  { id: "leaderboard", label: "Ranks", icon: "🏆" },
];

export function PlayShell() {
  const navigate = useNavigate();
  const { team, clearTeam } = useTeam();
  const { dark, toggle } = useDarkMode();
  const [tab, setTab] = useState<Tab>("home");
  const [showWin, setShowWin] = useState(false);
  const wasWinning = useRef(false);

  const state = useGame(team?.gameId ?? null);

  // Redirect to join if no stored team.
  useEffect(() => {
    if (!team) navigate("/", { replace: true });
  }, [team, navigate]);

  const currentTeam = useMemo(
    () => state.teams.find((t) => t.id === team?.teamId),
    [state.teams, team?.teamId],
  );

  const status = team
    ? computeWinStatus(team.teamId, state.checkins, state.completions)
    : null;

  // Fire the win banner when the team crosses into "can sit down".
  useEffect(() => {
    if (!status) return;
    if (status.canSitDown && !wasWinning.current) setShowWin(true);
    wasWinning.current = status.canSitDown;
  }, [status]);

  if (!team) return null;

  if (state.loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Loading the hunt…" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="safe-top flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">🍗</div>
        <p className="font-display text-xl font-bold">Couldn't load the game</p>
        <p className="max-w-xs text-sm opacity-70">{state.error}</p>
        <button
          onClick={() => state.refresh()}
          className="font-display rounded-2xl bg-[var(--color-gold)] px-6 py-3 font-bold text-white"
        >
          Retry
        </button>
        <button onClick={() => { clearTeam(); navigate("/"); }} className="text-sm underline opacity-60">
          Leave game
        </button>
      </div>
    );
  }

  const teamColor = currentTeam?.color ?? "#C8860A";
  const teamName = currentTeam?.name ?? team.teamName;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/10 bg-[var(--color-paper)]/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍗</span>
          <div>
            <p className="font-display text-sm font-extrabold leading-none">OÙ EST LE POULET</p>
            <p className="text-[11px] font-semibold opacity-50">Game #{team.gameCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveDot connected={state.connected} />
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="rounded-full border border-black/15 px-2 py-1 text-sm"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 pt-4">
        {tab === "home" && (
          <Dashboard
            teamId={team.teamId}
            teamName={teamName}
            teamColor={teamColor}
            checkins={state.checkins}
            completions={state.completions}
            chickenLocation={state.game?.chicken_location ?? null}
          />
        )}
        {tab === "bars" && (
          <BarsTab gameId={team.gameId} teamId={team.teamId} checkins={state.checkins} />
        )}
        {tab === "challenges" && (
          <ChallengesTab
            gameId={team.gameId}
            teamId={team.teamId}
            teamName={teamName}
            completions={state.completions}
            pending={state.pendingChallenges}
          />
        )}
        {tab === "leaderboard" && (
          <LeaderboardTab
            teams={state.teams}
            checkins={state.checkins}
            completions={state.completions}
            currentTeamId={team.teamId}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="safe-bottom sticky bottom-0 z-20 grid grid-cols-4 border-t-2 border-black/10 bg-[var(--color-paper)]/95 backdrop-blur">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 transition ${
                active ? "text-[var(--color-gold)]" : "opacity-50"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="font-display text-[11px] font-bold uppercase tracking-wide">
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Live pushed challenge from the Chicken */}
      {state.newPush && (
        <PushedChallengeToast
          push={state.newPush}
          gameId={team.gameId}
          teamId={team.teamId}
          onDismiss={state.dismissPush}
        />
      )}

      {/* Win celebration */}
      {showWin && <WinBanner onClose={() => setShowWin(false)} />}
    </div>
  );
}
