import { useEffect } from "react";
import { checkAndInstallUpdate } from "@/features/update/checkAndInstallUpdate";

/** Auto-check GitHub Releases shortly after launch (desktop builds only). */
export function useAutoUpdater() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkAndInstallUpdate({ confirmInstall: true, silentIfUpToDate: true });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);
}
