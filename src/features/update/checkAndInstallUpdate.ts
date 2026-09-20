import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import {
  beginUpdateDownload,
  closeUpdateUi,
  reportUpdateError,
  reportUpdateInstalling,
  reportUpdateProgress,
  reportUpdateReady,
  setUpdateCancelHandler,
} from "@/features/update/updateUi";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Checks GitHub Releases for a newer build, downloads it with a progress dialog,
 * then waits for the user to restart.
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

    beginUpdateDownload(update.version);

    let cancelled = false;
    setUpdateCancelHandler(() => {
      cancelled = true;
      void update.close();
    });

    let downloaded = 0;
    let contentLength: number | null = null;

    try {
      await update.downloadAndInstall((event) => {
        if (cancelled) return;
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? null;
            downloaded = 0;
            reportUpdateProgress(0, contentLength);
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            reportUpdateProgress(downloaded, contentLength);
            break;
          case "Finished":
            reportUpdateInstalling();
            break;
        }
      });
    } catch (error) {
      if (cancelled) {
        closeUpdateUi();
        return "skipped";
      }
      throw error;
    } finally {
      setUpdateCancelHandler(null);
    }

    if (cancelled) {
      closeUpdateUi();
      return "skipped";
    }

    reportUpdateReady();
    return "updated";
  } catch (error) {
    console.error("Updater failed", error);
    const detail =
      error instanceof Error ? error.message : "Could not check for updates.";
    reportUpdateError(detail);
    if (!silentIfUpToDate) {
      await message(detail, { title: "Update failed", kind: "error" });
    }
    return "error";
  }
}

export async function relaunchAfterUpdate(): Promise<void> {
  await relaunch();
}
