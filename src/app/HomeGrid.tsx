import type { ReactNode } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ArrowLeftRight,
  Download,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { AppView } from "@/app/views";
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
        Save videos from YouTube, Dailymotion, Vimeo, Vevo, and more.
      </Trans>
    ),
    icon: Download,
  },
  {
    id: "transfer",
    title: <Trans>Transfer</Trans>,
    description: (
      <Trans>Move a video from one media platform to another.</Trans>
    ),
    icon: ArrowLeftRight,
  },
  {
    id: "upload",
    title: <Trans>Upload</Trans>,
    description: <Trans>Send a local video to your Celluloid account.</Trans>,
    icon: Upload,
  },
];

type HomeGridProps = {
  onSelect: (view: Exclude<AppView, "home">) => void;
};

export function HomeGrid({ onSelect }: HomeGridProps) {
  const { t } = useLingui();

  return (
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
              <span className="block font-serif text-xl tracking-tight text-foreground">
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
  );
}
