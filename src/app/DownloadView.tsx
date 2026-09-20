import { useState } from "react";
import { DownloadForm } from "@/features/download/components/DownloadForm";
import { DownloadQueue } from "@/features/download/components/DownloadQueue";
import { ProviderTabs } from "@/features/download/components/ProviderTabs";
import { useCookieSettings } from "@/features/download/hooks/useCookieSettings";
import { useDownloads } from "@/features/download/hooks/useDownloads";
import type { DownloadProvider } from "@/features/download/providers";

export function DownloadView() {
  const cookies = useCookieSettings();
  const { queue, busy, resolveInfo, enqueue, clearCompleted } = useDownloads(
    cookies.cookieOptions,
  );
  const [provider, setProvider] = useState<DownloadProvider>("youtube");

  return (
    <div className="flex flex-col gap-5">
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
