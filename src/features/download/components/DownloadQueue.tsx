import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  CheckCircle2,
  CircleAlert,
  Download,
  FolderOpen,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/shared/lib/utils";
import { openDownloadFolder } from "../api/tauri";
import type { QueueItem } from "../types";

type DownloadQueueProps = {
  items: QueueItem[];
  onClearCompleted: () => void;
};

const STATUS_LABELS = {
  completed: msg`Completed`,
  error: msg`Failed`,
  downloading: msg`Downloading`,
  fetching: msg`Fetching`,
  queued: msg`Queued`,
} as const;

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  const { t } = useLingui();
  const label = t(STATUS_LABELS[status] ?? STATUS_LABELS.queued);
  if (status === "completed") {
    return (
      <CheckCircle2
        aria-label={label}
        className="size-4 shrink-0 text-success"
      />
    );
  }
  if (status === "error") {
    return (
      <CircleAlert
        aria-label={label}
        className="size-4 shrink-0 text-destructive"
      />
    );
  }
  return (
    <Download aria-label={label} className="size-4 shrink-0 text-primary" />
  );
}

function progressClass(status: QueueItem["status"]) {
  if (status === "error") {
    return "[&_[data-slot=progress-indicator]]:bg-destructive";
  }
  if (status === "completed") {
    return "[&_[data-slot=progress-indicator]]:bg-success";
  }
  return "";
}

export function DownloadQueue({ items, onClearCompleted }: DownloadQueueProps) {
  const { t } = useLingui();
  const hasCompleted = items.some((item) => item.status === "completed");
  const completedCount = items.filter((i) => i.status === "completed").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-pretty">
          <Trans>Downloads</Trans>
        </CardTitle>
        {hasCompleted ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="ghost" size="sm">
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  <Trans>Clear Completed</Trans>
                </Button>
              }
            />
            <AlertDialogContent size="sm" className="overscroll-contain">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <Trans>Clear Completed Downloads?</Trans>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <Plural
                    value={completedCount}
                    one="Remove # completed item from this list. Files on disk stay untouched."
                    other="Remove # completed items from this list. Files on disk stay untouched."
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Trans>Cancel</Trans>
                </AlertDialogCancel>
                <AlertDialogAction onClick={onClearCompleted}>
                  <Trans>Clear Completed</Trans>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            <Trans>Fetched videos appear here while they download.</Trans>
          </p>
        ) : (
          <ul
            className="space-y-3"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {items.map((item) => {
              const statusText = t(
                STATUS_LABELS[item.status] ?? STATUS_LABELS.queued,
              );
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex gap-3">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        width={96}
                        height={56}
                        loading="lazy"
                        className="h-14 w-24 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-accent">
                        <StatusIcon status={item.status} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="truncate font-medium"
                          title={item.title}
                          translate="no"
                        >
                          {item.title}
                        </p>
                        <StatusIcon status={item.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.formatLabel}
                      </p>

                      <Progress
                        value={Math.min(100, Math.max(0, item.percent))}
                        className={cn("mt-2", progressClass(item.status))}
                        aria-label={`${statusText} ${Math.round(item.percent)}%`}
                      />

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                        <span>{Math.round(item.percent)}%</span>
                        {item.speed ? <span>{item.speed}</span> : null}
                        {item.eta ? (
                          <span>
                            <Trans>ETA {item.eta}</Trans>
                          </span>
                        ) : null}
                        {item.error ? (
                          <span className="break-words text-destructive normal-nums">
                            {item.error}
                          </span>
                        ) : null}
                        {item.status === "completed" ? (
                          <Button
                            type="button"
                            variant="link"
                            size="xs"
                            className="h-auto px-0 normal-nums"
                            onClick={() => {
                              void openDownloadFolder(item.outputDir);
                            }}
                          >
                            <FolderOpen
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            <Trans>Open Folder</Trans>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
