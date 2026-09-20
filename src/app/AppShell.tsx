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
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-5 pb-4"
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

          {showHomeIntro ? (
            <p className="max-w-xl text-sm text-pretty text-muted-foreground">
              <Trans>
                Download, transfer, or upload videos across YouTube,
                Dailymotion, Vimeo, Vevo, and more.
              </Trans>
            </p>
          ) : null}

          {onBack && sectionTitle ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={onBack}
                aria-label={t`Back to home`}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <h2 className="font-serif text-xl tracking-tight text-pretty text-foreground">
                {sectionTitle}
              </h2>
            </div>
          ) : null}
        </header>

        <div className="flex flex-1 flex-col gap-5">{children}</div>
      </main>

      <footer className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-4 text-xs text-muted-foreground">
        <a
          href={APP_WEBSITE_URL}
          className="underline-offset-3 hover:text-foreground hover:underline"
          onClick={(event) => {
            event.preventDefault();
            void openUrl(APP_WEBSITE_URL);
          }}
        >
          {APP_WEBSITE_LABEL}
        </a>
        <button
          type="button"
          className="cursor-pointer underline-offset-3 hover:text-foreground hover:underline"
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
      </footer>
    </div>
  );
}
