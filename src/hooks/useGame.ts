import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type {
  AdminReadReceipt,
  BarCheckin,
  ChallengeCompletion,
  Game,
  Message,
  PendingChallenge,
  PushedChallenge,
  Team,
  TeamLocation,
} from "../lib/types";

/** A loud, full-screen banner the team can't miss. */
export type GameAlert =
  | { kind: "points"; id: string; points: number; name: string }
  | { kind: "rejected"; id: string; name: string; reason: string | null }
  | { kind: "message"; id: string; preview: string };

export interface GameState {
  game: Game | null;
  teams: Team[];
  checkins: BarCheckin[];
  completions: ChallengeCompletion[];
  pushedChallenges: PushedChallenge[];
  pendingChallenges: PendingChallenge[];
  teamLocations: TeamLocation[];
  messages: Message[];
  adminReadReceipts: AdminReadReceipt[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  /** Newest pushed challenge that arrived live and hasn't been dismissed. */
  newPush: PushedChallenge | null;
  dismissPush: () => void;
  /** Oldest queued banner alert for the watched team (null if none). */
  alert: GameAlert | null;
  dismissAlert: () => void;
  refresh: () => Promise<void>;
  refreshPending: () => Promise<void>;
  refreshCompletions: () => Promise<void>;
  refreshTeams: () => Promise<void>;
}

/**
 * Loads all data for a game and keeps it live via Supabase Realtime.
 * On any change we refetch the affected table — simplest + most reliable for a
 * one-night game with a handful of teams.
 */
export function useGame(gameId: string | null, notifyTeamId?: string | null): GameState {
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [checkins, setCheckins] = useState<BarCheckin[]>([]);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [pushedChallenges, setPushedChallenges] = useState<PushedChallenge[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<PendingChallenge[]>([]);
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminReadReceipts, setAdminReadReceipts] = useState<AdminReadReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [newPush, setNewPush] = useState<PushedChallenge | null>(null);
  const [alerts, setAlerts] = useState<GameAlert[]>([]);

  const seenPushIds = useRef<Set<string>>(new Set());
  // Rows we've already turned into (or skipped for) a banner alert.
  const seenCompletionIds = useRef<Set<string>>(new Set());
  const seenMessageIds = useRef<Set<string>>(new Set());
  const seenRejectedIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  // Keep the watched team id in a ref so fetchers read the latest without
  // being torn down/recreated (which would reset their identity in deps).
  const notifyRef = useRef<string | null>(notifyTeamId ?? null);
  useEffect(() => {
    notifyRef.current = notifyTeamId ?? null;
  }, [notifyTeamId]);

  const enqueueAlert = useCallback((a: GameAlert) => {
    setAlerts((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a]));
  }, []);
  const dismissAlert = useCallback(() => setAlerts((prev) => prev.slice(1)), []);

  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase.from("games").select().eq("id", gameId).maybeSingle();
    if (data) setGame(data);
  }, [gameId]);

  const fetchTeams = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("teams")
      .select()
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    if (data) setTeams(data);
  }, [gameId]);

  const fetchCheckins = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase.from("bar_checkins").select().eq("game_id", gameId);
    if (data) setCheckins(data);
  }, [gameId]);

  const fetchCompletions = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("challenge_completions")
      .select()
      .eq("game_id", gameId);
    if (!data) return;
    setCompletions(data);

    const teamId = notifyRef.current;
    if (!teamId) return;
    if (!initialized.current) {
      // First load — remember everything so old rows don't fire a banner.
      data.forEach((c) => seenCompletionIds.current.add(c.id));
      return;
    }
    for (const c of data) {
      if (c.team_id !== teamId || seenCompletionIds.current.has(c.id)) continue;
      seenCompletionIds.current.add(c.id);
      enqueueAlert({ kind: "points", id: c.id, points: c.points, name: c.challenge_name });
    }
  }, [gameId, enqueueAlert]);

  const fetchPushed = useCallback(async () => {
    if (!gameId) return;
    const { data, error: err } = await supabase
      .from("pushed_challenges")
      .select()
      .eq("game_id", gameId)
      .order("pushed_at", { ascending: false });
    if (err) {
      console.error("[OELP] fetch pushed_challenges failed", err);
      return;
    }
    if (!data) return;
    setPushedChallenges(data);

    if (!initialized.current) {
      // First load — mark everything seen so old pushes don't toast.
      data.forEach((p) => seenPushIds.current.add(p.id));
      return;
    }
    // Fire the toast for the newest unseen push (covers both realtime + poll).
    const unseen = data.filter((p) => !seenPushIds.current.has(p.id));
    if (unseen.length > 0) {
      // data is newest-first, so unseen[0] is the most recent.
      const newest = unseen[0];
      unseen.forEach((p) => seenPushIds.current.add(p.id));
      console.debug("[OELP] new pushed challenge", newest.id, newest.challenge_text);
      setNewPush(newest);
    }
  }, [gameId]);

  const fetchPending = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("pending_challenges")
      .select()
      .eq("game_id", gameId)
      .order("submitted_at", { ascending: true });
    if (!data) return;
    setPendingChallenges(data);

    const teamId = notifyRef.current;
    if (!teamId) return;
    if (!initialized.current) {
      data.forEach((p) => p.status === "rejected" && seenRejectedIds.current.add(p.id));
      return;
    }
    for (const p of data) {
      if (p.team_id !== teamId || p.status !== "rejected") continue;
      if (seenRejectedIds.current.has(p.id)) continue;
      seenRejectedIds.current.add(p.id);
      enqueueAlert({ kind: "rejected", id: p.id, name: p.challenge_name, reason: p.rejection_reason });
    }
  }, [gameId, enqueueAlert]);

  const fetchReceipts = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("admin_read_receipts")
      .select()
      .eq("game_id", gameId);
    if (data) setAdminReadReceipts(data);
  }, [gameId]);

  const fetchLocations = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("team_locations")
      .select()
      .eq("game_id", gameId);
    if (data) setTeamLocations(data);
  }, [gameId]);

  const fetchMessages = useCallback(async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("messages")
      .select()
      .eq("game_id", gameId)
      .order("sent_at", { ascending: true });
    if (!data) return;
    setMessages(data);

    const teamId = notifyRef.current;
    if (!teamId) return;
    if (!initialized.current) {
      data.forEach((m) => seenMessageIds.current.add(m.id));
      return;
    }
    for (const m of data) {
      if (m.team_id !== teamId || !m.is_chicken) continue;
      if (seenMessageIds.current.has(m.id)) continue;
      seenMessageIds.current.add(m.id);
      enqueueAlert({ kind: "message", id: m.id, preview: m.content.slice(0, 40) });
    }
  }, [gameId, enqueueAlert]);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    setError(null);
    try {
      await Promise.all([
        fetchGame(),
        fetchTeams(),
        fetchCheckins(),
        fetchCompletions(),
        fetchPushed(),
        fetchPending(),
        fetchLocations(),
        fetchMessages(),
        fetchReceipts(),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load game data.");
    }
  }, [
    gameId,
    fetchGame,
    fetchTeams,
    fetchCheckins,
    fetchCompletions,
    fetchPushed,
    fetchPending,
    fetchLocations,
    fetchMessages,
    fetchReceipts,
  ]);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    initialized.current = false;
    setLoading(true);

    if (!gameId) {
      setLoading(false);
      return;
    }
    if (!supabaseConfigured) {
      setError("Supabase is not configured. Add your keys to .env and reload.");
      setLoading(false);
      return;
    }

    (async () => {
      await refresh();
      if (!cancelled) {
        initialized.current = true;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, refresh]);

  // Realtime subscriptions — one channel, filtered to this game.
  useEffect(() => {
    if (!gameId || !supabaseConfigured) return;

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` },
        () => void fetchTeams(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bar_checkins", filter: `game_id=eq.${gameId}` },
        () => void fetchCheckins(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_completions",
          filter: `game_id=eq.${gameId}`,
        },
        () => void fetchCompletions(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pushed_challenges",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.debug("[OELP] realtime: pushed_challenges INSERT", payload.new);
          // fetchPushed() handles seen-tracking + firing the toast.
          void fetchPushed();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_challenges",
          filter: `game_id=eq.${gameId}`,
        },
        () => void fetchPending(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_locations",
          filter: `game_id=eq.${gameId}`,
        },
        () => void fetchLocations(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `game_id=eq.${gameId}`,
        },
        () => void fetchMessages(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_read_receipts",
          filter: `game_id=eq.${gameId}`,
        },
        () => void fetchReceipts(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => setGame(payload.new as Game),
      )
      .subscribe((status) => {
        console.debug("[OELP] realtime channel status:", status);
        setConnected(status === "SUBSCRIBED");
      });

    // Fallback poll so pushed challenges still arrive if the realtime socket
    // drops or the table isn't in the publication.
    const poll = setInterval(() => {
      void fetchPushed();
    }, 12_000);

    // Chat needs to feel instant — poll messages every 3s as a fast fallback
    // alongside Realtime.
    const chatPoll = setInterval(() => {
      void fetchMessages();
    }, 3_000);

    return () => {
      clearInterval(poll);
      clearInterval(chatPoll);
      void supabase.removeChannel(channel);
    };
  }, [
    gameId,
    fetchTeams,
    fetchCheckins,
    fetchCompletions,
    fetchPushed,
    fetchPending,
    fetchLocations,
    fetchMessages,
    fetchReceipts,
  ]);

  const dismissPush = useCallback(() => setNewPush(null), []);

  return {
    game,
    teams,
    checkins,
    completions,
    pushedChallenges,
    pendingChallenges,
    teamLocations,
    messages,
    adminReadReceipts,
    loading,
    error,
    connected,
    newPush,
    dismissPush,
    alert: alerts[0] ?? null,
    dismissAlert,
    refresh,
    refreshPending: fetchPending,
    refreshCompletions: fetchCompletions,
    refreshTeams: fetchTeams,
  };
}
