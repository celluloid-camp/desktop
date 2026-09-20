import { useState, type ReactNode } from "react";
import { Trans } from "@lingui/react/macro";
import { AppShell } from "@/app/AppShell";
import { DownloadView } from "@/app/DownloadView";
import { HomeGrid } from "@/app/HomeGrid";
import { PlaceholderView } from "@/app/PlaceholderView";
import type { AppView } from "@/app/views";
import { UpdateProgressDialog } from "@/features/update/UpdateProgressDialog";
import { useAutoUpdater } from "@/features/update/useAutoUpdater";

const VIEW_TITLES: Record<Exclude<AppView, "home">, ReactNode> = {
  download: <Trans>Download</Trans>,
  transfer: <Trans>Transfer</Trans>,
  upload: <Trans>Upload</Trans>,
};

export function App() {
  const [view, setView] = useState<AppView>("home");
  useAutoUpdater();

  return (
    <>
      <AppShell
        showHomeIntro={view === "home"}
        sectionTitle={view === "home" ? undefined : VIEW_TITLES[view]}
        onBack={view === "home" ? undefined : () => setView("home")}
      >
        {view === "home" ? <HomeGrid onSelect={setView} /> : null}
        {view === "download" ? <DownloadView /> : null}
        {view === "transfer" ? <PlaceholderView kind="transfer" /> : null}
        {view === "upload" ? <PlaceholderView kind="upload" /> : null}
      </AppShell>
      <UpdateProgressDialog />
    </>
  );
}
