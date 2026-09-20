import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { checkAndInstallUpdate } from "@/features/update/checkAndInstallUpdate";

/** Auto-check GitHub Releases shortly after launch (desktop builds only). */
export function useAutoUpdater() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkAndInstallUpdate({
        confirmInstall: true,
        silentIfUpToDate: true,
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void listen("menu://check-for-updates", () => {
      void checkAndInstallUpdate({
        confirmInstall: true,
        silentIfUpToDate: false,
      });
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
