import { useCallback, useState } from "react";
import type { PushedChallenge } from "../lib/types";

/** Pushed challenges the team tapped "Later" on — kept in localStorage. */
export function useLaterPushes(teamId: string | null) {
  const key = `oelp.laterPushes.${teamId ?? ""}`;

  const [items, setItems] = useState<PushedChallenge[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as PushedChallenge[]) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback(
    (next: PushedChallenge[]) => {
      localStorage.setItem(key, JSON.stringify(next));
      setItems(next);
    },
    [key],
  );

  const add = useCallback(
    (p: PushedChallenge) =>
      setItems((prev) => {
        if (prev.some((x) => x.id === p.id)) return prev;
        const next = [...prev, p];
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      }),
    [key],
  );

  const remove = useCallback(
    (id: string) =>
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== id);
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      }),
    [key],
  );

  return { items, add, remove, persist };
}
