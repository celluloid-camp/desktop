import { Trans, useLingui } from "@lingui/react/macro";
import {
  DOWNLOAD_PROVIDERS,
  DOWNLOAD_PROVIDER_META,
  type DownloadProvider,
} from "@/features/download/providers";
import { cn } from "@/shared/lib/utils";

type ProviderTabsProps = {
  value: DownloadProvider;
  onChange: (provider: DownloadProvider) => void;
};

export function ProviderTabs({ value, onChange }: ProviderTabsProps) {
  const { t } = useLingui();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        <Trans>Provider</Trans>
      </p>
      <div
        role="tablist"
        aria-label={t`Video provider`}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {DOWNLOAD_PROVIDERS.map((id) => {
          const meta = DOWNLOAD_PROVIDER_META[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(id)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 transition-colors",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "bg-primary/10 text-foreground ring-primary/30"
                  : "bg-card text-muted-foreground ring-foreground/10 hover:bg-accent/40 hover:text-foreground hover:ring-foreground/15",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background/80 ring-1 ring-foreground/5">
                <img
                  src={meta.logoSrc}
                  alt=""
                  width={18}
                  height={18}
                  className="size-[18px] object-contain"
                  draggable={false}
                />
              </span>
              <span className="truncate text-sm font-medium" translate="no">
                {meta.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
