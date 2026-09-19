import { useCallback, useEffect, useState } from "react";
import { listYoutubeBrowserSessions } from "../api/tauri";
import type { BrowserSession, CookieOptions } from "../types";

const STORAGE_KEY = "celluloid-desktop.cookies";

type StoredCookies = {
  mode: "none" | "browser";
  browserId: string | null;
};

const DEFAULTS: StoredCookies = {
  mode: "none",
  browserId: null,
};

function readStored(): StoredCookies {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<StoredCookies> & {
      browser?: string | null;
    };
    return {
      mode: parsed.mode === "browser" ? "browser" : "none",
      browserId: parsed.browserId ?? parsed.browser ?? null,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useCookieSettings() {
  const [mode, setMode] = useState<"none" | "browser">("none");
  const [browserId, setBrowserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setMode(stored.mode);
    setBrowserId(stored.browserId);
    setHydrated(true);
  }, []);

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const found = await listYoutubeBrowserSessions();
      setSessions(found);

      setBrowserId((current) => {
        if (current && found.some((s) => s.id === current)) {
          return current;
        }
        return found[0]?.id ?? null;
      });
      setMode((current) => {
        if (found.length === 0) return "none";
        if (current === "browser") return "browser";
        const stored = readStored();
        return stored.mode === "browser" ? "browser" : current;
      });
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode, browserId } satisfies StoredCookies),
    );
  }, [mode, browserId, hydrated]);

  const cookieOptions = useCallback((): CookieOptions | null => {
    if (mode !== "browser" || !browserId) return null;
    const session = sessions.find((s) => s.id === browserId);
    if (!session?.fromBrowser) return null;
    return { browser: session.fromBrowser };
  }, [mode, browserId, sessions]);

  return {
    mode,
    setMode,
    browserId,
    setBrowserId,
    sessions,
    loadingSessions,
    refreshSessions,
    cookieOptions,
  };
}
