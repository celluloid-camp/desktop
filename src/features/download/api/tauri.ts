import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import type {
  BrowserSession,
  CookieOptions,
  DependenciesStatus,
  VideoInfo,
} from "../types";

export function checkDependencies() {
  return invoke<DependenciesStatus>("check_dependencies");
}

export function openDownloadFolder(path: string) {
  return openPath(path);
}

export function listYoutubeBrowserSessions() {
  return invoke<BrowserSession[]>("list_youtube_browser_sessions");
}

export function fetchVideoInfo(url: string, cookies?: CookieOptions | null) {
  return invoke<VideoInfo>("fetch_video_info", {
    url,
    cookies: cookies ?? null,
  });
}

export function downloadVideo(args: {
  downloadId: string;
  url: string;
  outputDir: string;
  format?: string;
  cookies?: CookieOptions | null;
}) {
  return invoke<string>("download_video", args);
}
