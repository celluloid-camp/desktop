import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { downloadVideo, fetchVideoInfo } from "../api/tauri";
import type {
  CookieOptions,
  DownloadProgress,
  QueueItem,
  VideoInfo,
} from "../types";

function createId() {
  return crypto.randomUUID();
}

export function useDownloads(getCookies: () => CookieOptions | null) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<DownloadProgress>("download-progress", (event) => {
      const progress = event.payload;
      setQueue((prev) =>
        prev.map((item) =>
          item.id === progress.downloadId
            ? {
                ...item,
                percent: progress.percent,
                status: progress.status,
                speed: progress.speed,
                eta: progress.eta,
                error: progress.message ?? item.error,
              }
            : item,
        ),
      );
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const resolveInfo = useCallback(
    async (url: string): Promise<VideoInfo> => {
      setBusy(true);
      try {
        return await fetchVideoInfo(url.trim(), getCookies());
      } finally {
        setBusy(false);
      }
    },
    [getCookies],
  );

  const enqueue = useCallback(
    async (args: {
      info: VideoInfo;
      formatId: string;
      formatLabel: string;
      outputDir: string;
    }) => {
      const id = createId();
      const item: QueueItem = {
        id,
        url: args.info.webpageUrl,
        title: args.info.title,
        thumbnail: args.info.thumbnail,
        formatLabel: args.formatLabel,
        formatId: args.formatId,
        outputDir: args.outputDir,
        percent: 0,
        status: "queued",
      };

      setQueue((prev) => [item, ...prev]);

      try {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === id ? { ...q, status: "downloading" } : q,
          ),
        );
        await downloadVideo({
          downloadId: id,
          url: args.info.webpageUrl,
          outputDir: args.outputDir,
          format: args.formatId,
          cookies: getCookies(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        setQueue((prev) =>
          prev.map((q) =>
            q.id === id ? { ...q, status: "error", error: message } : q,
          ),
        );
      }
    },
    [getCookies],
  );

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== "completed"));
  }, []);

  return {
    queue,
    busy,
    resolveInfo,
    enqueue,
    clearCompleted,
  };
}
