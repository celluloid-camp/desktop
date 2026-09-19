# Celluloid Desktop

Celluloid Desktop app to work with videos.  

## Stack

- Tauri 2 + React + TypeScript + Vite
- Tailwind CSS
- Feature-driven frontend (`src/app`, `src/features`, `src/shared`)
- Biome (lint/format)
- Bundled [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg sidecars

## Prerequisites

- Rust toolchain ([Tauri prerequisites](https://tauri.app/start/prerequisites/))
- Node.js + pnpm

Sidecars are fetched automatically on `pnpm tauri dev` / build. To fetch manually:

```bash
pnpm sidecars:fetch
# or copy from PATH:
pnpm sidecars:fetch -- --from-path
```

## Scripts

- `pnpm tauri dev` — desktop app (ensures sidecars, then starts)
- `pnpm dev` — web frontend only
- `pnpm sidecars:fetch` — download yt-dlp + ffmpeg for the host triple
- `pnpm build` — typecheck + frontend build
- `pnpm lingui:extract` — update `en` / `fr` catalogs after changing UI strings
- `pnpm typecheck` / `pnpm lint` / `pnpm format` / `pnpm check`

## Internationalization

UI strings use [Lingui](https://lingui.dev/) (`en` / `fr`). The app follows the desktop language (`navigator.languages`) and falls back to English. Catalogs live in `src/locales/{locale}/messages.po` and are compiled by the Vite plugin at build time.

## Usage

1. Run `pnpm tauri dev`
2. Paste a YouTube URL and click **Fetch**
3. Choose quality and a download folder
4. Click **Download** — progress appears in the queue

