import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Checks GitHub Releases for a newer build, downloads it, installs, then relaunches.
 * No-ops outside the Tauri desktop runtime (e.g. browser-only `pnpm dev`).
 */
export async function checkAndInstallUpdate(options?: {
  /** Prompt before downloading / installing. Default true. */
  confirmInstall?: boolean;
  /** Silent when already up to date. Default true. */
  silentIfUpToDate?: boolean;
}): Promise<"updated" | "up-to-date" | "skipped" | "error"> {
  if (!isTauriRuntime()) return "skipped";

  const confirmInstall = options?.confirmInstall ?? true;
  const silentIfUpToDate = options?.silentIfUpToDate ?? true;

  try {
    const update = await check();
    if (!update) {
      if (!silentIfUpToDate) {
        await message("You're on the latest version.", {
          title: "Celluloid Desktop",
          kind: "info",
        });
      }
      return "up-to-date";
    }

    if (confirmInstall) {
      const ok = await ask(
        `Version ${update.version} is available. Download and install now?`,
        {
          title: "Update available",
          kind: "info",
          okLabel: "Update",
          cancelLabel: "Later",
        },
      );
      if (!ok) return "skipped";
    }

    await update.downloadAndInstall();
    await relaunch();
    return "updated";
  } catch (error) {
    console.error("Updater failed", error);
    if (!silentIfUpToDate) {
      await message(
        error instanceof Error ? error.message : "Could not check for updates.",
        { title: "Update failed", kind: "error" },
      );
    }
    return "error";
  }
}
