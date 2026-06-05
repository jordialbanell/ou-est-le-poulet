import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeam } from "../hooks/useTeam";
import { useGame } from "../hooks/useGame";
import { useDarkMode } from "../hooks/useDarkMode";
import { useGeoTracking } from "../hooks/useGeoTracking";
import { useLaterPushes } from "../hooks/useLaterPushes";
import { computeWinStatus } from "../lib/scoring";
import { Dashboard } from "./Dashboard";
import { BarsTab } from "./BarsTab";
import { ChallengesTab } from "./ChallengesTab";
import { LeaderboardTab } from "./LeaderboardTab";
import { MapTab } from "./MapTab";
import { WinBanner } from "./WinBanner";
import { PushedChallengeToast } from "./PushedChallengeToast";
import { AlertBanner } from "./AlertBanner";
import { ChatModal } from "./ChatModal";
import { LiveDot, LiveRefresh, Spinner } from "./common";
import { markTeamRead } from "../lib/actions";

type Tab = "home" | "bars" | "challenges" | "leaderboard" | "map";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "bars", label: "Bars", icon: "🍺" },
  { id: "challenges", label: "Tasks", icon: "🎯" },
  { id: "leaderboard", label: "Ranks", icon: "🏆" },
  { id: "map", label: "Map", icon: "🗺️" },
];

export function PlayShell() {
  const navigate = useNavigate();
  const { team, clearTeam, setTeam } = useTeam();
  const { dark, toggle } = useDarkMode();
  const [tab, setTab] = useState<Tab>("home");
  const [showWin, setShowWin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const wasWinning = useRef(false);

  // Local read-stamp for instant badge clearing; the durable value lives on
  // teams.last_read_at (so unread survives closing the tab).
  const [localChatRead, setLocalChatRead] = useState("");

  const state = useGame(team?.gameId ?? null, team?.teamId ?? null);
  const laterPushes = useLaterPushes(team?.teamId ?? null);

  // Manual + 30s background refresh share one fetch (state.refresh) and stamp
  // the same "last refreshed" time. The poll is quiet — state updates in place,
  // no spinner, no remount.
  const [lastRefreshed, setLastRefreshed] = useState(() => Date.now());
  const doRefresh = useCallback(async () => {
    await state.refresh();
    setLastRefreshed(Date.now());
  }, [state.refresh]);
  useEffect(() => {
    const id = setInterval(() => void doRefresh(), 30_000);
    return () => clearInterval(id);
  }, [doRefresh]);

  // Share this team's live GPS while playing.
  const { status: geoStatus } = useGeoTracking(
    team?.gameId ?? null,
    team?.teamId ?? null,
    Boolean(team),
  );

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

  // Durable last-read comes from the team row; fall back to the local stamp so
  // the badge clears instantly before the server round-trip lands.
  const serverChatRead = currentTeam?.last_read_at ?? "";
  const chatLastRead = serverChatRead > localChatRead ? serverChatRead : localChatRead;

  // Unread = messages from the Chicken to this team since we last opened chat.
  const unreadChat = useMemo(
    () =>
      state.messages.filter(
        (m) => m.team_id === team?.teamId && m.is_chicken && m.sent_at > chatLastRead,
      ).length,
    [state.messages, team?.teamId, chatLastRead],
  );

  function openChat() {
    setLocalChatRead(new Date().toISOString());
    if (team) void markTeamRead(team.teamId);
    setChatOpen(true);
  }

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
        <div className="flex items-center gap-2.5">
          <LiveDot connected={state.connected} />
          <LiveRefresh onRefresh={doRefresh} lastRefreshed={lastRefreshed} compact />
          <button
            onClick={openChat}
            aria-label="Chat with the Chicken"
            className="relative rounded-full border border-black/15 px-2 py-1 text-sm"
          >
            💬
            {unreadChat > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-alert)] px-1 text-[11px] font-extrabold text-white">
                {unreadChat}
              </span>
            )}
          </button>
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
            team={currentTeam ?? null}
            teamId={team.teamId}
            teamName={teamName}
            teamColor={teamColor}
            checkins={state.checkins}
            completions={state.completions}
            pending={state.pendingChallenges}
            chickenLocation={state.game?.chicken_location ?? null}
            onRenamed={(name) => setTeam({ ...team, teamName: name })}
            onRefresh={doRefresh}
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
            laterPushes={laterPushes.items}
            onLaterActioned={laterPushes.remove}
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
        {tab === "map" && (
          <MapTab
            teams={state.teams}
            teamLocations={state.teamLocations}
            currentTeamId={team.teamId}
            geoStatus={geoStatus}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="safe-bottom sticky bottom-0 z-20 grid grid-cols-5 border-t-2 border-black/10 bg-[var(--color-paper)]/95 backdrop-blur">
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
          onLater={(p) => {
            laterPushes.add(p);
            state.dismissPush();
          }}
          onDismiss={state.dismissPush}
        />
      )}

      {/* Loud score / message banner — overlays everything, any tab */}
      {state.alert && (
        <AlertBanner
          key={state.alert.id}
          alert={state.alert}
          onDismiss={state.dismissAlert}
          onOpenChat={() => {
            state.dismissAlert();
            openChat();
          }}
        />
      )}

      {/* Win celebration */}
      {showWin && <WinBanner onClose={() => setShowWin(false)} />}

      {/* Team ↔ Chicken chat */}
      {chatOpen && (
        <ChatModal
          gameId={team.gameId}
          teamId={team.teamId}
          teamName={teamName}
          messages={state.messages}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
