export type VideoFormat = {
  formatId: string;
  ext: string;
  resolution?: string | null;
  fps?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  filesize?: number | null;
  formatNote?: string | null;
  tbr?: number | null;
};

export type VideoInfo = {
  id: string;
  title: string;
  channel?: string | null;
  duration?: number | null;
  thumbnail?: string | null;
  webpageUrl: string;
  formats: VideoFormat[];
};

export type DownloadProgress = {
  downloadId: string;
  percent: number;
  speed?: string | null;
  eta?: string | null;
  status: "queued" | "fetching" | "downloading" | "completed" | "error";
  message?: string | null;
  outputPath?: string | null;
};

export type QueueItem = {
  id: string;
  url: string;
  title: string;
  thumbnail?: string | null;
  formatLabel: string;
  formatId: string;
  outputDir: string;
  percent: number;
  status: DownloadProgress["status"];
  speed?: string | null;
  eta?: string | null;
  error?: string | null;
};

export type DependenciesStatus = {
  ytDlp: boolean;
  ffmpeg: boolean;
  ytDlpPath?: string | null;
  ffmpegPath?: string | null;
  ytDlpSource?: "sidecar" | "path" | null;
  ffmpegSource?: "sidecar" | "path" | null;
};

export type CookieOptions = {
  /** Exact yt-dlp `--cookies-from-browser` value */
  browser?: string | null;
};

export type BrowserSession = {
  id: string;
  label: string;
  fromBrowser: string;
};
