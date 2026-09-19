#!/usr/bin/env node
/**
 * Download yt-dlp + ffmpeg sidecars for the current (or given) Rust target triple.
 * Binaries land in src-tauri/binaries/{name}-{triple}[.exe]
 *
 * Usage:
 *   node scripts/fetch-sidecars.mjs
 *   node scripts/fetch-sidecars.mjs --force
 *   node scripts/fetch-sidecars.mjs --triple aarch64-apple-darwin
 *   node scripts/fetch-sidecars.mjs --from-path
 */
import { execFileSync, execSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const binariesDir = path.join(root, "src-tauri", "binaries");

const force = process.argv.includes("--force");
const fromPath = process.argv.includes("--from-path");
const tripleIdx = process.argv.indexOf("--triple");
const triple =
  tripleIdx >= 0
    ? process.argv[tripleIdx + 1]
    : process.env.SIDECAR_TRIPLE ||
      process.env.CARGO_BUILD_TARGET ||
      execSync("rustc --print host-tuple", { encoding: "utf8" }).trim();

const isWindows = triple.includes("windows");
const ext = isWindows ? ".exe" : "";

const YT_DLP_URLS = {
  "aarch64-apple-darwin":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
  "x86_64-apple-darwin":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
  "x86_64-unknown-linux-gnu":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
  "aarch64-unknown-linux-gnu":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64",
  "x86_64-pc-windows-msvc":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
};

// Static ffmpeg builds (eugeneware/ffmpeg-static)
const FFMPEG_URLS = {
  "aarch64-apple-darwin":
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-arm64.gz",
  "x86_64-apple-darwin":
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-x64.gz",
  "x86_64-unknown-linux-gnu":
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-x64.gz",
  "aarch64-unknown-linux-gnu":
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-arm64.gz",
  "x86_64-pc-windows-msvc":
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz",
};

function which(bin) {
  try {
    return execFileSync(process.platform === "win32" ? "where" : "which", [bin], {
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
  } catch {
    return null;
  }
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  await pipeline(res.body, createWriteStream(dest));
}

async function downloadGunzip(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  await pipeline(res.body, createGunzip(), createWriteStream(dest));
}

function moveFile(from, to) {
  try {
    renameSync(from, to);
  } catch (error) {
    // Windows CI often uses TEMP on C: and the workspace on D: — rename fails with EXDEV.
    if (error && typeof error === "object" && "code" in error && error.code === "EXDEV") {
      copyFileSync(from, to);
      unlinkSync(from);
      return;
    }
    throw error;
  }
}

function ensureExecutable(filePath) {
  if (!isWindows) {
    chmodSync(filePath, 0o755);
  }
}

async function ensureBinary(name, urlMap, { gzip = false } = {}) {
  const dest = path.join(binariesDir, `${name}-${triple}${ext}`);
  if (existsSync(dest) && !force) {
    console.log(`✓ ${path.basename(dest)} already present`);
    return dest;
  }

  if (fromPath) {
    const local = which(name);
    if (!local) {
      throw new Error(`${name} not found on PATH`);
    }
    copyFileSync(local, dest);
    ensureExecutable(dest);
    console.log(`✓ copied ${name} from PATH → ${path.basename(dest)}`);
    return dest;
  }

  const url = urlMap[triple];
  if (!url) {
    throw new Error(
      `No download URL for ${name} on ${triple}. Use --from-path or add a mapping.`,
    );
  }

  console.log(`↓ downloading ${name} for ${triple}…`);
  const tmp = path.join(tmpdir(), `${name}-${Date.now()}`);
  try {
    if (gzip) {
      await downloadGunzip(url, tmp);
    } else {
      await download(url, tmp);
    }
    moveFile(tmp, dest);
    ensureExecutable(dest);
    console.log(`✓ ${path.basename(dest)}`);
    return dest;
  } catch (error) {
    if (existsSync(tmp)) unlinkSync(tmp);
    const local = which(name);
    if (local) {
      copyFileSync(local, dest);
      ensureExecutable(dest);
      console.warn(`! download failed, copied ${name} from PATH instead`);
      console.warn(`  ${error instanceof Error ? error.message : error}`);
      return dest;
    }
    throw error;
  }
}

mkdirSync(binariesDir, { recursive: true });
writeFileSync(path.join(binariesDir, ".gitkeep"), "");

await ensureBinary("yt-dlp", YT_DLP_URLS);
await ensureBinary("ffmpeg", FFMPEG_URLS, { gzip: true });

console.log("Sidecars ready.");
