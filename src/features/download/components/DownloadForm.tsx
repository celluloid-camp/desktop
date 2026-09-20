import { downloadDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Cookie,
  FolderOpen,
  Link2,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, formatBytes, formatDuration } from "@/shared/lib/utils";
import {
  DOWNLOAD_PROVIDER_META,
  type DownloadProvider,
} from "../providers";
import type { BrowserSession, VideoFormat, VideoInfo } from "../types";

const BEST_FORMAT_ID = "bv*+ba/b";

type SelectOption = { value: string; label: string };

type DownloadFormProps = {
  provider: DownloadProvider;
  busy: boolean;
  cookieMode: "none" | "browser";
  cookieBrowserId: string | null;
  sessions: BrowserSession[];
  loadingSessions: boolean;
  onCookieModeChange: (mode: "none" | "browser") => void;
  onCookieBrowserChange: (browserId: string) => void;
  onRefreshSessions: () => void;
  onResolve: (url: string) => Promise<VideoInfo>;
  onEnqueue: (args: {
    info: VideoInfo;
    formatId: string;
    formatLabel: string;
    outputDir: string;
  }) => Promise<void>;
};

function formatLabel(format: VideoFormat): string {
  const parts = [
    format.resolution ?? format.formatNote ?? format.formatId,
    format.ext,
    format.fps ? `${Math.round(format.fps)}fps` : null,
    format.filesize ? formatBytes(format.filesize) : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function suggestedFormats(formats: VideoFormat[]): VideoFormat[] {
  const seen = new Set<string>();
  const picks: VideoFormat[] = [];

  for (const format of formats) {
    const hasVideo = format.vcodec && format.vcodec !== "none";
    if (!hasVideo) continue;
    const key = format.resolution ?? format.formatId;
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(format);
    if (picks.length >= 8) break;
  }

  return picks;
}

export function DownloadForm({
  provider,
  busy,
  cookieMode,
  cookieBrowserId,
  sessions,
  loadingSessions,
  onCookieModeChange,
  onCookieBrowserChange,
  onRefreshSessions,
  onResolve,
  onEnqueue,
}: DownloadFormProps) {
  const { t } = useLingui();
  const providerMeta = DOWNLOAD_PROVIDER_META[provider];
  const [url, setUrl] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [formatId, setFormatId] = useState(BEST_FORMAT_ID);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInfo(null);
    setError(null);
    setStatus(null);
    setFormatId(BEST_FORMAT_ID);
  }, [provider]);

  const options = useMemo(
    () => (info ? suggestedFormats(info.formats) : []),
    [info],
  );

  const sessionItems = useMemo<SelectOption[]>(
    () => [
      { value: "none", label: t`No Cookies (Anonymous)` },
      ...sessions.map((session) => ({
        value: session.id,
        label: t`Use ${session.label} (Logged In)`,
      })),
    ],
    [sessions, t],
  );

  const qualityItems = useMemo<SelectOption[]>(
    () => [
      { value: BEST_FORMAT_ID, label: t`Best Available (Auto)` },
      ...options.map((format) => ({
        value: format.formatId,
        label: formatLabel(format),
      })),
    ],
    [options, t],
  );

  const selectedLabel =
    sessions.find((s) => s.id === cookieBrowserId)?.label ?? cookieBrowserId;

  const sessionValue =
    cookieMode === "browser" && cookieBrowserId ? cookieBrowserId : "none";

  useEffect(() => {
    void downloadDir()
      .then((dir) => {
        setOutputDir((current) => current || dir);
      })
      .catch(() => {
        /* keep empty; user can choose a folder */
      });
  }, []);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  async function handleResolve(event: FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError(t`Paste a video URL, then try again.`);
      urlRef.current?.focus();
      return;
    }

    setError(null);
    setStatus(t`Contacting ${providerMeta.name}…`);
    setInfo(null);
    try {
      const resolved = await onResolve(trimmed);
      setInfo(resolved);
      setFormatId(BEST_FORMAT_ID);
      setStatus(null);
    } catch (err) {
      setStatus(null);
      const detail = err instanceof Error ? err.message : String(err);
      setError(
        t`${detail} Check the URL or try another browser session.`,
      );
    }
  }

  async function pickFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t`Choose Download Folder`,
      defaultPath: outputDir || undefined,
    });
    if (typeof selected === "string") {
      setOutputDir(selected);
      setError(null);
    }
  }

  async function handleDownload() {
    if (!info) return;

    if (!outputDir) {
      setError(t`Choose a download folder, then start the download.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatus(t`Queued for download…`);
    try {
      const selected = options.find((f) => f.formatId === formatId);
      const hasAudio = selected?.acodec && selected.acodec !== "none";
      const downloadFormat =
        formatId === BEST_FORMAT_ID
          ? BEST_FORMAT_ID
          : hasAudio
            ? formatId
            : `${formatId}+bestaudio/${formatId}/best`;

      await onEnqueue({
        info,
        formatId: downloadFormat,
        formatLabel:
          formatId === BEST_FORMAT_ID
            ? t`Best available`
            : selected
              ? formatLabel(selected)
              : formatId,
        outputDir,
      });
      setUrl("");
      setInfo(null);
      setFormatId(BEST_FORMAT_ID);
      setStatus(t`Added to Downloads below.`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(
        t`${detail} Try another quality or refresh your browser session.`,
      );
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">
          <Trans>Fetch Video</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            Paste a {providerMeta.name} URL — optionally reuse a browser login,
            then choose quality and folder.
          </Trans>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleResolve} noValidate>
          <div className="space-y-2">
            <Label htmlFor="video-url">
              <Trans>Video URL</Trans>
            </Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Link2
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  ref={urlRef}
                  id="video-url"
                  name="video-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  className="pl-9"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={providerMeta.placeholder}
                  aria-invalid={Boolean(error && !info)}
                  aria-describedby={error ? "fetch-error" : undefined}
                />
              </div>
              <Button type="submit" disabled={busy} size="lg">
                {busy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Search aria-hidden="true" className="size-4" />
                )}
                {busy ? <Trans>Fetching…</Trans> : <Trans>Fetch Video</Trans>}
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-background/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="provider-session"
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Cookie aria-hidden="true" className="size-4" />
                <Trans>{providerMeta.name} Session</Trans>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onRefreshSessions}
                disabled={loadingSessions}
                aria-label={
                  loadingSessions
                    ? t`Refreshing browser sessions`
                    : t`Refresh browser sessions`
                }
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 motion-reduce:animate-none",
                    loadingSessions && "animate-spin",
                  )}
                />
                {loadingSessions ? (
                  <Trans>Refreshing…</Trans>
                ) : (
                  <Trans>Refresh</Trans>
                )}
              </Button>
            </div>

            {loadingSessions ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                <Trans>
                  Scanning local browsers for {providerMeta.name} logins…
                </Trans>
              </p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                <Trans>
                  No logged-in {providerMeta.name} sessions found. Sign in to{" "}
                  {providerMeta.name} in Chrome, Safari, Firefox, or another
                  supported browser, then refresh.
                </Trans>
              </p>
            ) : (
              <>
                <Select
                  value={sessionValue}
                  items={sessionItems}
                  onValueChange={(value) => {
                    if (!value || value === "none") {
                      onCookieModeChange("none");
                      return;
                    }
                    onCookieModeChange("browser");
                    onCookieBrowserChange(value);
                  }}
                >
                  <SelectTrigger
                    id="provider-session"
                    className="w-full"
                    aria-label={t`${providerMeta.name} session browser`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cookieMode === "browser" && cookieBrowserId ? (
                  <p className="text-xs text-muted-foreground">
                    <Trans>
                      Uses the {providerMeta.name} login from {selectedLabel}.
                      macOS may ask for Keychain access; closing the browser
                      first can help. If downloads fail with an expired session,
                      sign in again in that browser and refresh.
                    </Trans>
                  </p>
                ) : null}
              </>
            )}
          </div>
        </form>

        <div
          ref={errorRef}
          tabIndex={-1}
          className="outline-none"
          aria-live="polite"
        >
          {error ? (
            <Alert id="fetch-error" variant="destructive">
              <AlertTitle>
                <Trans>Something went wrong</Trans>
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {status && !error ? (
            <p className="text-sm text-muted-foreground">{status}</p>
          ) : null}
        </div>

        {info ? (
          <>
            <Separator />
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-pretty">
                  <Trans>Ready to Download</Trans>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Trans>
                    Pick quality and a save folder, then start the download.
                  </Trans>
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                {info.thumbnail ? (
                  <img
                    src={info.thumbnail}
                    alt=""
                    width={160}
                    height={90}
                    className="aspect-video w-full rounded-xl object-cover md:h-full"
                  />
                ) : (
                  <div
                    className="flex aspect-video items-center justify-center rounded-xl bg-accent text-sm text-primary"
                    aria-hidden="true"
                  >
                    <Trans>No thumbnail</Trans>
                  </div>
                )}

                <div className="min-w-0 space-y-3">
                  <div>
                    <h3
                      className="text-lg font-semibold text-pretty break-words"
                      translate="no"
                    >
                      {info.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span translate="no">
                        {info.channel ?? t`Unknown channel`}
                      </span>
                      {" · "}
                      <span className="tabular-nums">
                        {formatDuration(info.duration)}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="download-quality">
                      <Trans>Quality</Trans>
                    </Label>
                    <Select
                      value={formatId}
                      items={qualityItems}
                      onValueChange={(v) => v && setFormatId(v)}
                    >
                      <SelectTrigger
                        id="download-quality"
                        className="w-full"
                        aria-label={t`Download quality`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {qualityItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={pickFolder}>
                      <FolderOpen aria-hidden="true" className="size-4" />
                      {outputDir ? (
                        <Trans>Change Folder</Trans>
                      ) : (
                        <Trans>Choose Folder</Trans>
                      )}
                    </Button>
                    <Button
                      type="button"
                      className="min-w-0 flex-1 bg-foreground text-background hover:bg-foreground/90"
                      onClick={handleDownload}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin motion-reduce:animate-none"
                        />
                      ) : null}
                      {submitting ? (
                        <Trans>Starting…</Trans>
                      ) : (
                        <Trans>Start Download</Trans>
                      )}
                    </Button>
                  </div>

                  {outputDir ? (
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={outputDir}
                    >
                      <Trans>
                        Saving to{" "}
                        <span
                          className="font-medium text-foreground"
                          translate="no"
                        >
                          {outputDir}
                        </span>
                      </Trans>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <Trans>
                        Choose a folder before starting the download.
                      </Trans>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
