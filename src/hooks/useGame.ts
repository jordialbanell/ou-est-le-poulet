import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type {
  BarCheckin,
  ChallengeCompletion,
  Game,
  Message,
  PendingChallenge,
  PushedChallenge,
  Team,
  TeamLocation,
} from "../lib/types";

export interface GameState {
  game: Game | null;
  teams: Team[];
  checkins: BarCheckin[];
  completions: ChallengeCompletion[];
  pushedChallenges: PushedChallenge[];
  pendingChallenges: PendingChallenge[];
  teamLocations: TeamLocation[];
  messages: Message[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  /** Newest pushed challenge that arrived live and hasn't been dismissed. */
  newPush: PushedChallenge | null;
  dismissPush: () => void;
  refresh: () => Promise<void>;
  refreshPending: () => Promise<void>;
}

/**
 * Loads all data for a game and keeps it live via Supabase Realtime.
 * On any change we refetch the affected table — simplest + most reliable for a
 * one-night game with a handful of teams.
 */
export function useGame(gameId: string | null): GameState {
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [checkins, setCheckins] = useState<BarCheckin[]>([]);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [pushedChallenges, setPushedChallenges] = useState<PushedChallenge[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<PendingChallenge[]>([]);
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [newPush, setNewPush] = useState<PushedChallenge | null>(null);

  const seenPushIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

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
    if (data) setCompletions(data);
  }, [gameId]);

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
    if (data) setPendingChallenges(data);
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
    if (data) setMessages(data);
  }, [gameId]);

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
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => setGame(payload.new as Game),
      )
      .subscribe((status) => {
        console.debug("[OELP] realtime channel status:", status);
        setConnected(status === "SUBSCRIBED");
      });

    // Fallback poll so pushed challenges + messages still arrive if the
    // realtime socket drops or the table isn't in the publication.
    const poll = setInterval(() => {
      void fetchPushed();
      void fetchMessages();
    }, 12_000);

    return () => {
      clearInterval(poll);
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
    loading,
    error,
    connected,
    newPush,
    dismissPush,
    refresh,
    refreshPending: fetchPending,
  };
}
