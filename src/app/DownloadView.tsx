import { useEffect, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DownloadForm } from "@/features/download/components/DownloadForm";
import { DownloadQueue } from "@/features/download/components/DownloadQueue";
import { ProviderTabs } from "@/features/download/components/ProviderTabs";
import { checkDependencies } from "@/features/download/api/tauri";
import { useCookieSettings } from "@/features/download/hooks/useCookieSettings";
import { useDownloads } from "@/features/download/hooks/useDownloads";
import type { DownloadProvider } from "@/features/download/providers";
import type { DependenciesStatus } from "@/features/download/types";

export function DownloadView() {
  const cookies = useCookieSettings();
  const { queue, busy, resolveInfo, enqueue, clearCompleted } = useDownloads(
    cookies.cookieOptions,
  );
  const [deps, setDeps] = useState<DependenciesStatus | null>(null);
  const [provider, setProvider] = useState<DownloadProvider>("youtube");

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
    <div className="flex flex-col gap-5">
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

      <ProviderTabs value={provider} onChange={setProvider} />

      <DownloadForm
        provider={provider}
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
    </div>
  );
}
