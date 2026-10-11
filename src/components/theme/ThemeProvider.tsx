"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/** Two modes, and only two. There is no "follow the system" state. */
export type Theme = "light" | "dark";

const STORAGE_KEY = "skillgrid-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Flip to the other mode. */
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Runs before paint to set `data-theme` from storage, so the first frame is
 * already the right mode (no white flash on a dark screen).
 *
 * Also performs the one-time migration away from the retired "system" value: a
 * returning visitor who had picked it keeps whatever they were actually seeing,
 * we just write the concrete mode back so it never resolves again.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${STORAGE_KEY}";var raw=localStorage.getItem(k);var t=raw==="dark"?"dark":raw==="light"?"light":null;if(t===null){t=raw==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";localStorage.setItem(k,t);}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the stored choice. THEME_INIT_SCRIPT has already painted the right
  // mode before paint, so nothing may be applied until this has run — otherwise
  // the first effect would clobber a dark choice with the default for a frame.
  useEffect(() => {
    let stored: Theme = "light";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (isTheme(raw)) {
        stored = raw;
      } else if (raw === "system") {
        // Legacy value from when three modes existed.
        stored = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        localStorage.setItem(STORAGE_KEY, stored);
      }
    } catch {
      /* storage blocked — stay on the default */
    }
    setThemeState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme, hydrated]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked — the choice simply won't persist */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage blocked — the choice simply won't persist */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
