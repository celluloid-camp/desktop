import { downloadDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Cookie,
  FolderOpen,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
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
  const urlRef = useRef<HTMLTextAreaElement>(null);

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
      { value: "none", label: t`No cookies (signed out)` },
      ...sessions.map((session) => ({
        value: session.id,
        label: t`Use ${session.label} (signed in)`,
      })),
    ],
    [sessions, t],
  );

  const qualityItems = useMemo<SelectOption[]>(
    () => [
      { value: BEST_FORMAT_ID, label: t`Best available` },
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
      setError(t`Paste a video URL and try again.`);
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
      setError(t`${detail} Check the URL, or try another browser login.`);
    }
  }

  async function pickFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t`Choose a folder`,
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
      setError(t`Choose a folder first.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatus(t`Queued…`);
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
        t`${detail} Try another quality, or refresh your browser login.`,
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
          <Trans>Get video</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            Paste a {providerMeta.name} link. You can reuse a browser login,
            then pick quality and a folder.
          </Trans>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleResolve} noValidate>
          <div className="space-y-2">
            <Label htmlFor="video-url">
              <Trans>Video URL</Trans>
            </Label>
            <InputGroup className="h-auto min-h-28 bg-white/70">
              <InputGroupTextarea
                ref={urlRef}
                id="video-url"
                name="video-url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                rows={3}
                className="min-h-20 field-sizing-content px-2.5 text-sm md:text-sm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={providerMeta.placeholder}
                aria-invalid={Boolean(error && !info)}
                aria-describedby={error ? "fetch-error" : undefined}
              />
              <InputGroupAddon
                align="block-end"
                className="justify-end border-t"
              >
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={busy}
                  className="h-8 px-3"
                >
                  {busy ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                  ) : (
                    <Search aria-hidden="true" className="size-4" />
                  )}
                  {busy ? (
                    <Trans>Looking up…</Trans>
                  ) : (
                    <Trans>Get video</Trans>
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-white/70 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="provider-session"
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Cookie aria-hidden="true" className="size-4" />
                <Trans>{providerMeta.name} login</Trans>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onRefreshSessions}
                disabled={loadingSessions}
                aria-label={
                  loadingSessions
                    ? t`Refreshing browser logins`
                    : t`Refresh browser logins`
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
                  Looking for {providerMeta.name} logins in your browsers…
                </Trans>
              </p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                <Trans>
                  No {providerMeta.name} login found. Sign in to{" "}
                  {providerMeta.name} in Chrome, Safari, Firefox, or another
                  supported browser, then hit Refresh.
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
                    aria-label={t`${providerMeta.name} login browser`}
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
                      Uses your {providerMeta.name} login from {selectedLabel}.
                      On macOS, Keychain may ask for permission; closing the
                      browser first often helps. If downloads fail because the
                      login expired, sign in again there and hit Refresh.
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
                  <Trans>Ready to download</Trans>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Trans>
                    Pick a quality and folder, then start the download.
                  </Trans>
                </p>
              </div>

              <div className="flex gap-4">
                {info.thumbnail ? (
                  <img
                    src={info.thumbnail}
                    alt=""
                    width={160}
                    height={90}
                    className="aspect-video h-[90px] w-40 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex aspect-video h-[90px] w-40 shrink-0 items-center justify-center rounded-xl bg-accent text-sm text-primary"
                    aria-hidden="true"
                  >
                    <Trans>No thumbnail</Trans>
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-3">
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
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white hover:bg-white/90"
                      onClick={pickFolder}
                    >
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
                        <Trans>Download</Trans>
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
                      <Trans>Choose a folder first.</Trans>
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
