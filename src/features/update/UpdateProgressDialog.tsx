import { useEffect, useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { X } from "lucide-react";
import { ask } from "@tauri-apps/plugin-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { relaunchAfterUpdate } from "@/features/update/checkAndInstallUpdate";
import {
  cancelUpdateDownload,
  closeUpdateUi,
  reportUpdateError,
  subscribeUpdateUi,
  type UpdateUiState,
} from "@/features/update/updateUi";

export function UpdateProgressDialog() {
  const { t } = useLingui();
  const [state, setState] = useState<UpdateUiState>(() => ({
    open: false,
    phase: "downloading",
    version: "",
    percent: null,
    downloadedBytes: 0,
    totalBytes: null,
    error: null,
  }));
  const [restarting, setRestarting] = useState(false);

  useEffect(() => subscribeUpdateUi(setState), []);

  const busy = state.phase === "downloading" || state.phase === "installing";
  const canCancel = state.phase === "downloading";
  const progressValue =
    state.percent ??
    (state.phase === "installing" || state.phase === "ready" ? 100 : 0);

  async function handleCancelClick() {
    if (!canCancel) return;
    const ok = await ask(t`Cancel this update download?`, {
      title: t`Cancel download`,
      kind: "warning",
      okLabel: t`Cancel download`,
      cancelLabel: t`Keep downloading`,
    });
    if (ok) {
      cancelUpdateDownload();
    }
  }

  return (
    <AlertDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open && !busy && state.phase !== "ready") {
          closeUpdateUi();
        }
      }}
    >
      <AlertDialogContent size="default" className="relative sm:max-w-sm">
        {canCancel || state.phase === "error" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            aria-label={
              canCancel ? t`Cancel download` : t`Close`
            }
            onClick={() => {
              if (canCancel) {
                void handleCancelClick();
                return;
              }
              closeUpdateUi();
            }}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}

        <AlertDialogHeader className="pr-8">
          <AlertDialogTitle>
            {state.phase === "ready" ? (
              <Trans>Update ready</Trans>
            ) : state.phase === "error" ? (
              <Trans>Update failed</Trans>
            ) : state.phase === "installing" ? (
              <Trans>Installing update…</Trans>
            ) : (
              <Trans>Downloading update…</Trans>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {state.phase === "error" ? (
              (state.error ?? <Trans>Something went wrong.</Trans>)
            ) : state.phase === "ready" ? (
              <Trans>
                Version {state.version} is installed. Restart Celluloid Desktop
                to finish.
              </Trans>
            ) : (
              <Trans>Downloading version {state.version}.</Trans>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {busy || state.phase === "ready" ? (
          <div className="space-y-2">
            <Progress value={progressValue} className="w-full" />
            <p className="text-xs text-muted-foreground tabular-nums">
              {state.phase === "installing" ? (
                <Trans>Installing…</Trans>
              ) : state.phase === "ready" ? (
                <Trans>Download complete</Trans>
              ) : state.percent != null ? (
                `${state.percent}%`
              ) : (
                <Trans>Downloading…</Trans>
              )}
            </p>
          </div>
        ) : null}

        <AlertDialogFooter>
          {state.phase === "ready" ? (
            <Button
              type="button"
              disabled={restarting}
              onClick={() => {
                setRestarting(true);
                void relaunchAfterUpdate().catch((error) => {
                  console.error(error);
                  setRestarting(false);
                  reportUpdateError(
                    error instanceof Error
                      ? error.message
                      : "Could not restart the app.",
                  );
                });
              }}
            >
              {restarting ? (
                <Trans>Restarting…</Trans>
              ) : (
                <Trans>Restart</Trans>
              )}
            </Button>
          ) : state.phase === "error" ? (
            <AlertDialogCancel onClick={() => closeUpdateUi()}>
              <Trans>Close</Trans>
            </AlertDialogCancel>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
