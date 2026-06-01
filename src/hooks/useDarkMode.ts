import { useCallback, useEffect, useState } from "react";

const KEY = "oelp.dark";

/** Dark-mode toggle persisted in localStorage — handy in a dark bar. */
export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem(KEY) === "1");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(KEY, dark ? "1" : "0");
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  return { dark, toggle };
}
