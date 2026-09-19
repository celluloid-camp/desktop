# Celluloid Desktop

Desktop app for [Celluloid](https://celluloid.com) to work with videos — download and upload on major platforms like YouTube, Dailymotion, Vimeo, and Vevo.

[<img src="assets/badges/macos.svg" alt="Download for macOS" height="66" />](https://github.com/celluloid-camp/desktop/releases/latest/download/Celluloid.Desktop-macos-aarch64.dmg)
[<img src="assets/badges/windows.svg" alt="Download for Windows" height="66" />](https://github.com/celluloid-camp/desktop/releases/latest/download/Celluloid.Desktop-windows-x64-setup.exe)
[<img src="assets/badges/linux.svg" alt="Download for Linux" height="66" />](https://github.com/celluloid-camp/desktop/releases/latest/download/Celluloid.Desktop-linux-amd64.AppImage)

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



