import { useEffect, useState, type ReactNode } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  AlertTriangle,
  ArrowLeftRight,
  Download,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { AppView } from "@/app/views";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkDependencies } from "@/features/download/api/tauri";
import type { DependenciesStatus } from "@/features/download/types";
import { cn } from "@/shared/lib/utils";

type HomeTile = {
  id: Exclude<AppView, "home">;
  title: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
};

const TILES: HomeTile[] = [
  {
    id: "download",
    title: <Trans>Download</Trans>,
    description: (
      <Trans>
        Save videos from YouTube, Dailymotion, Vimeo, Vevo…
      </Trans>
    ),
    icon: Download,
  },
  {
    id: "transfer",
    title: <Trans>Transfer</Trans>,
    description: (
      <Trans>Move a video from one site to another.</Trans>
    ),
    icon: ArrowLeftRight,
  },
  {
    id: "upload",
    title: <Trans>Upload</Trans>,
    description: (
      <Trans>Send a video from your computer to your Celluloid account.</Trans>
    ),
    icon: Upload,
  },
];

type HomeGridProps = {
  onSelect: (view: Exclude<AppView, "home">) => void;
};

export function HomeGrid({ onSelect }: HomeGridProps) {
  const { t } = useLingui();
  const [deps, setDeps] = useState<DependenciesStatus | null>(null);

  useEffect(() => {
    checkDependencies()
      .then(setDeps)
      .catch(() => setDeps({ ytDlp: false, ffmpeg: false }));
  }, []);

  const downloadsUnavailable = Boolean(deps && (!deps.ytDlp || !deps.ffmpeg));

  return (
    <div className="flex flex-col gap-5">
      {downloadsUnavailable ? (
        <Alert
          className="border-warning/30 bg-warning/15 text-[#7A5A0A]"
          role="status"
        >
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>
            <Trans>Download unavailable</Trans>
          </AlertTitle>
          <AlertDescription className="text-[#7A5A0A]/90">
            <Trans>
              Celluloid couldn’t find the tools it needs to save videos.
              Restart the app. If that doesn’t help, reinstall Celluloid
              Desktop.
            </Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      <nav
        aria-label={t`Home`}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              className={cn(
                "group flex h-full flex-col items-start gap-4 rounded-xl bg-card p-5 text-left shadow-[var(--shadow-card)] ring-1 ring-foreground/10 backdrop-blur-md transition-colors",
                "hover:bg-accent/40 hover:ring-foreground/15",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                "active:translate-y-px",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="space-y-1.5">
                <span className="block font-abril text-xl tracking-tight text-foreground">
                  {tile.title}
                </span>
                <span className="block text-sm text-pretty text-muted-foreground">
                  {tile.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
