#!/usr/bin/env node
/**
 * No-op if host sidecars already exist; otherwise fetch them.
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const triple =
  process.env.SIDECAR_TRIPLE ||
  process.env.CARGO_BUILD_TARGET ||
  execSync("rustc --print host-tuple", { encoding: "utf8" }).trim();
const ext = triple.includes("windows") ? ".exe" : "";
const binariesDir = path.join(root, "src-tauri", "binaries");

const yt = path.join(binariesDir, `yt-dlp-${triple}${ext}`);
const ff = path.join(binariesDir, `ffmpeg-${triple}${ext}`);

if (existsSync(yt) && existsSync(ff)) {
  process.exit(0);
}

const fetchArgs = [path.join(root, "scripts", "fetch-sidecars.mjs")];
if (process.env.SIDECAR_TRIPLE || process.env.CARGO_BUILD_TARGET) {
  fetchArgs.push("--triple", triple);
}

const result = spawnSync(process.execPath, fetchArgs, { stdio: "inherit" });
process.exit(result.status ?? 1);
