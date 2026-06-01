import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "oelp.team";

export interface StoredTeam {
  teamId: string;
  gameId: string;
  teamName: string;
  gameCode: string;
}

function read(): StoredTeam | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTeam;
    if (parsed?.teamId && parsed?.gameId) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Current team identity, persisted in localStorage (no auth). */
export function useTeam() {
  const [team, setTeamState] = useState<StoredTeam | null>(() => read());

  // Keep multiple tabs / components in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTeamState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTeam = useCallback((next: StoredTeam) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTeamState(next);
  }, []);

  const clearTeam = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTeamState(null);
  }, []);

  return { team, setTeam, clearTeam };
}
