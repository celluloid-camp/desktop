# Celluloid Desktop

Desktop app for [Celluloid](https://celluloid.me) to work with videos, download and upload on major platforms like YouTube, Dailymotion, Vimeo, and Vevo.

## Download

![Download for macOS](assets/badges/macos.svg)
![Download for Windows](assets/badges/windows.svg)
![Download for Linux](assets/badges/linux.svg)

## Screenshot

![Celluloid Desktop screenshot](assets/screenshot.png)

## Stack

- Tauri 2 + React + TypeScript + Vite
- Tailwind CSS
- Feature-driven frontend (`src/app`, `src/features`, `src/shared`)
- Biome (lint/format)

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

