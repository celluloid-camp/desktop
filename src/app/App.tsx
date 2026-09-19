import { useEffect, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { AlertTriangle } from "lucide-react";
import { DownloadForm } from "@/features/download/components/DownloadForm";
import { DownloadQueue } from "@/features/download/components/DownloadQueue";
import { useCookieSettings } from "@/features/download/hooks/useCookieSettings";
import { useDownloads } from "@/features/download/hooks/useDownloads";
import { checkDependencies } from "@/features/download/api/tauri";
import type { DependenciesStatus } from "@/features/download/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Logo } from "@/shared/ui/Logo";

export function App() {
  const cookies = useCookieSettings();
  const { queue, busy, resolveInfo, enqueue, clearCompleted } = useDownloads(
    cookies.cookieOptions,
  );
  const [deps, setDeps] = useState<DependenciesStatus | null>(null);

  useEffect(() => {
    checkDependencies()
      .then(setDeps)
      .catch(() => setDeps({ ytDlp: false, ffmpeg: false }));
  }, []);

  const missingDeps =
    deps && (!deps.ytDlp || !deps.ffmpeg)
      ? [
          !deps.ytDlp ? "yt-dlp" : null,
          !deps.ffmpeg ? "ffmpeg" : null,
        ].filter(Boolean)
      : [];

  return (
    <div className="flex min-h-screen flex-col touch-manipulation">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        <Trans>Skip to main content</Trans>
      </a>

      <div className="titlebar-drag" data-tauri-drag-region />

      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 pb-8"
      >
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Logo height={32} />
            <h1
              className="font-serif text-2xl tracking-tight text-pretty text-foreground"
              translate="no"
            >
              Celluloid
            </h1>
          </div>
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">
            <Trans>
              Download and upload videos on YouTube, Dailymotion, Vimeo, Vevo,
              and more.
            </Trans>
          </p>
        </header>

        {missingDeps.length > 0 ? (
          <Alert
            className="border-warning/30 bg-warning/15 text-[#7A5A0A]"
            role="status"
          >
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>
              <Trans>Missing Sidecars</Trans>
            </AlertTitle>
            <AlertDescription className="text-[#7A5A0A]/90">
              <Trans>
                Could not find {missingDeps.join(" and ")}. Run{" "}
                <code className="rounded bg-background/70 px-1" translate="no">
                  pnpm sidecars:fetch
                </code>{" "}
                (or install them on PATH as a fallback).
              </Trans>
            </AlertDescription>
          </Alert>
        ) : null}

        <DownloadForm
          busy={busy}
          cookieMode={cookies.mode}
          cookieBrowserId={cookies.browserId}
          sessions={cookies.sessions}
          loadingSessions={cookies.loadingSessions}
          onCookieModeChange={cookies.setMode}
          onCookieBrowserChange={cookies.setBrowserId}
          onRefreshSessions={() => {
            void cookies.refreshSessions();
          }}
          onResolve={resolveInfo}
          onEnqueue={enqueue}
        />
        <DownloadQueue items={queue} onClearCompleted={clearCompleted} />
      </main>
    </div>
  );
}
