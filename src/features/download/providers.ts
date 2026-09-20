export const DOWNLOAD_PROVIDERS = [
  "youtube",
  "dailymotion",
  "vimeo",
  "vevo",
] as const;

export type DownloadProvider = (typeof DOWNLOAD_PROVIDERS)[number];

export type DownloadProviderMeta = {
  id: DownloadProvider;
  /** Brand display name (not translated) */
  name: string;
  logoSrc: string;
  placeholder: string;
  exampleHost: string;
};

export const DOWNLOAD_PROVIDER_META: Record<
  DownloadProvider,
  DownloadProviderMeta
> = {
  youtube: {
    id: "youtube",
    name: "YouTube",
    logoSrc: "/providers/youtube.svg",
    placeholder: "https://www.youtube.com/watch?v=…",
    exampleHost: "youtube.com",
  },
  dailymotion: {
    id: "dailymotion",
    name: "Dailymotion",
    logoSrc: "/providers/dailymotion.svg",
    placeholder: "https://www.dailymotion.com/video/…",
    exampleHost: "dailymotion.com",
  },
  vimeo: {
    id: "vimeo",
    name: "Vimeo",
    logoSrc: "/providers/vimeo.svg",
    placeholder: "https://vimeo.com/…",
    exampleHost: "vimeo.com",
  },
  vevo: {
    id: "vevo",
    name: "Vevo",
    logoSrc: "/providers/vevo.png",
    placeholder: "https://www.vevo.com/watch/…",
    exampleHost: "vevo.com",
  },
};
