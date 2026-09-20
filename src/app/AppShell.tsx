import type { ReactNode } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  APP_VERSION,
  APP_WEBSITE_LABEL,
  APP_WEBSITE_URL,
} from "@/shared/app-meta";
import { startWindowDragFromEvent } from "@/shared/lib/window-drag";
import { LocaleSwitch } from "@/shared/ui/LocaleSwitch";
import { Logo } from "@/shared/ui/Logo";
import { checkAndInstallUpdate } from "@/features/update/checkAndInstallUpdate";

type AppShellProps = {
  showHomeIntro?: boolean;
  sectionTitle?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
};

export function AppShell({
  showHomeIntro = false,
  sectionTitle,
  onBack,
  children,
}: AppShellProps) {
  const { t } = useLingui();

  return (
    <div
      className="flex min-h-screen flex-col touch-manipulation"
      data-tauri-drag-region
      onMouseDown={startWindowDragFromEvent}
    >
      <a
        href="#main"
        className="no-drag sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        <Trans>Skip to main content</Trans>
      </a>

      <div className="titlebar-drag" data-tauri-drag-region aria-hidden="true" />

      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 pb-4"
      >
        <header className="space-y-3" data-tauri-drag-region>
          <div className="flex items-center gap-3" data-tauri-drag-region>
            <h1
              className="font-abril text-2xl tracking-tight text-pretty text-foreground"
              translate="no"
              data-tauri-drag-region
            >
              Celluloid
            </h1>
            <Logo height={32} />
          </div>

          {showHomeIntro ? (
            <p
              className="max-w-xl text-sm text-pretty text-muted-foreground"
              data-tauri-drag-region
            >
              <Trans>
                Download, transfer, or upload videos on YouTube, Dailymotion,
                Vimeo, Vevo…
              </Trans>
            </p>
          ) : null}

          {onBack && sectionTitle ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="no-drag shrink-0"
                onClick={onBack}
                aria-label={t`Back to home`}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <h2
                className="font-abril text-xl tracking-tight text-pretty text-foreground"
                data-tauri-drag-region
              >
                {sectionTitle}
              </h2>
            </div>
          ) : null}
        </header>

        <div className="flex flex-1 flex-col gap-5">{children}</div>
      </main>

      <footer className="mx-auto flex w-full max-w-3xl items-end justify-between gap-3 px-5 py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <a
            href={APP_WEBSITE_URL}
            className="no-drag underline-offset-3 hover:text-foreground hover:underline"
            onClick={(event) => {
              event.preventDefault();
              void openUrl(APP_WEBSITE_URL);
            }}
          >
            {APP_WEBSITE_LABEL}
          </a>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p translate="no">CC BY-NC 2026 Consortium Canevas</p>
          <button
            type="button"
            className="no-drag cursor-pointer underline-offset-3 hover:text-foreground hover:underline"
            translate="no"
            title={t`Check for updates`}
            onClick={() => {
              void checkAndInstallUpdate({
                confirmInstall: true,
                silentIfUpToDate: false,
              });
            }}
          >
            v{APP_VERSION}
          </button>
        </div>
      </footer>
    </div>
  );
}
