use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VideoFormat {
    pub format_id: String,
    pub ext: String,
    pub resolution: Option<String>,
    pub fps: Option<f64>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub filesize: Option<u64>,
    pub format_note: Option<String>,
    pub tbr: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub id: String,
    pub title: String,
    pub channel: Option<String>,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    pub webpage_url: String,
    pub formats: Vec<VideoFormat>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub download_id: String,
    pub percent: f64,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub status: String,
    pub message: Option<String>,
    pub output_path: Option<String>,
}

#[derive(Deserialize)]
struct YtDlpFormat {
    format_id: String,
    ext: Option<String>,
    resolution: Option<String>,
    fps: Option<f64>,
    vcodec: Option<String>,
    acodec: Option<String>,
    filesize: Option<u64>,
    filesize_approx: Option<u64>,
    format_note: Option<String>,
    tbr: Option<f64>,
    height: Option<u32>,
}

#[derive(Deserialize)]
struct YtDlpInfo {
    id: String,
    title: String,
    channel: Option<String>,
    uploader: Option<String>,
    duration: Option<f64>,
    thumbnail: Option<String>,
    webpage_url: Option<String>,
    original_url: Option<String>,
    formats: Option<Vec<YtDlpFormat>>,
}

fn binary_extension() -> &'static str {
    if cfg!(target_os = "windows") {
        ".exe"
    } else {
        ""
    }
}

fn target_triple() -> &'static str {
    option_env!("TAURI_ENV_TARGET_TRIPLE").unwrap_or(env!("TARGET_TRIPLE"))
}

/// Resolve a bundled sidecar path (dev: binaries/name-triple, prod: next to exe).
fn bundled_sidecar_path(name: &str) -> Option<PathBuf> {
    let ext = binary_extension();
    let triple = target_triple();

    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(format!("{name}-{triple}{ext}"));
    if dev.is_file() {
        return Some(dev);
    }

    if let Ok(mut exe) = std::env::current_exe() {
        exe.pop();
        let prod = exe.join(format!("{name}{ext}"));
        if prod.is_file() {
            return Some(prod);
        }
        let with_triple = exe.join(format!("{name}-{triple}{ext}"));
        if with_triple.is_file() {
            return Some(with_triple);
        }
    }

    None
}

fn path_tool(name: &str) -> Option<PathBuf> {
    if let Ok(custom) = std::env::var(format!("{}_PATH", name.to_uppercase().replace('-', "_"))) {
        let path = PathBuf::from(custom);
        if path.is_file() {
            return Some(path);
        }
    }

    // Cheap PATH lookup without an extra crate.
    let path_env = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_env) {
        let candidate = dir.join(format!("{name}{}", binary_extension()));
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

fn resolve_tool(name: &str) -> Option<PathBuf> {
    bundled_sidecar_path(name).or_else(|| path_tool(name))
}

fn tool_source(path: &Path) -> &'static str {
    let binaries_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries");
    if path.starts_with(&binaries_dir) {
        "sidecar"
    } else if let Ok(mut exe) = std::env::current_exe() {
        exe.pop();
        if path.starts_with(&exe) {
            "sidecar"
        } else {
            "path"
        }
    } else {
        "path"
    }
}

async fn probe_binary(path: &Path, args: &[&str]) -> bool {
    TokioCommand::new(path)
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await
        .map(|s| s.success())
        .unwrap_or(false)
}

fn pick_formats(raw: Vec<YtDlpFormat>) -> Vec<VideoFormat> {
    let mut formats: Vec<VideoFormat> = raw
        .into_iter()
        .filter(|f| {
            let has_video = f.vcodec.as_deref().is_some_and(|c| c != "none");
            let has_audio = f.acodec.as_deref().is_some_and(|c| c != "none");
            has_video || has_audio
        })
        .map(|f| VideoFormat {
            format_id: f.format_id,
            ext: f.ext.unwrap_or_else(|| "mp4".to_string()),
            resolution: f.resolution.or_else(|| f.height.map(|h| format!("{h}p"))),
            fps: f.fps,
            vcodec: f.vcodec,
            acodec: f.acodec,
            filesize: f.filesize.or(f.filesize_approx),
            format_note: f.format_note,
            tbr: f.tbr,
        })
        .collect();

    formats.sort_by(|a, b| {
        let ah = a
            .resolution
            .as_ref()
            .and_then(|r| r.trim_end_matches('p').parse::<u32>().ok())
            .unwrap_or(0);
        let bh = b
            .resolution
            .as_ref()
            .and_then(|r| r.trim_end_matches('p').parse::<u32>().ok())
            .unwrap_or(0);
        bh.cmp(&ah)
    });

    formats
}

fn ffmpeg_args(ffmpeg: Option<&Path>) -> Vec<String> {
    match ffmpeg {
        Some(path) => vec![
            "--ffmpeg-location".to_string(),
            path.to_string_lossy().into_owned(),
        ],
        None => Vec::new(),
    }
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct CookieOptions {
    /// yt-dlp `--cookies-from-browser` value, e.g. `chrome`, `safari`, `firefox`.
    pub browser: Option<String>,
    /// Netscape-format cookies file path (`--cookies`).
    pub cookies_file: Option<String>,
}

const ALLOWED_BROWSERS: &[&str] = &[
    "brave", "chrome", "chromium", "edge", "firefox", "opera", "safari", "vivaldi",
    "whale",
];

fn cookie_args(options: &CookieOptions) -> Result<Vec<String>, String> {
    let mut args = Vec::new();

    if let Some(file) = options
        .cookies_file
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        let path = PathBuf::from(file);
        if !path.is_file() {
            return Err("Cookies file not found.".to_string());
        }
        args.push("--cookies".to_string());
        args.push(path.to_string_lossy().into_owned());
        return Ok(args);
    }

    if let Some(browser_raw) = options
        .browser
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        // `chrome:/path/to/User Data` — only validate the browser name, keep path casing.
        let name = browser_raw
            .split(['+', ':'])
            .next()
            .unwrap_or(browser_raw)
            .to_ascii_lowercase();
        if !ALLOWED_BROWSERS.contains(&name.as_str()) {
            return Err("Unsupported browser for cookies.".to_string());
        }
        args.push("--cookies-from-browser".to_string());
        args.push(browser_raw.to_string());
    }

    Ok(args)
}

fn used_browser_cookies(options: &CookieOptions) -> bool {
    options
        .browser
        .as_ref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
        || options
            .cookies_file
            .as_ref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false)
}

/// Map yt-dlp stderr to a short, user-facing message (no WARNING spam).
fn user_facing_error(context: &str, raw: &str, used_cookies: bool) -> String {
    let text = raw.trim();
    let lower = text.to_ascii_lowercase();

    let cookies_invalid = lower.contains("cookies are no longer valid")
        || lower.contains("rotated in the browser as a security measure");
    let forbidden = lower.contains("http error 403") || lower.contains("403: forbidden");
    let bot_check = lower.contains("sign in to confirm")
        || lower.contains("not a bot")
        || lower.contains("confirm you're not a bot");

    if cookies_invalid || (used_cookies && forbidden) {
        return format!(
            "{context}: Your YouTube browser session expired. Open YouTube in that browser, sign in again, click Refresh, then retry."
        );
    }
    if bot_check {
        return format!(
            "{context}: YouTube requires a logged-in session. Choose a browser with an active YouTube login."
        );
    }
    if forbidden {
        return format!(
            "{context}: YouTube blocked this download (403). Try another video or a logged-in browser session."
        );
    }
    if lower.contains("private video") || lower.contains("login required") {
        return format!(
            "{context}: This video needs a logged-in YouTube session."
        );
    }
    if lower.contains("video unavailable") {
        return format!("{context}: This video is unavailable.");
    }

    if let Some(line) = text
        .lines()
        .rev()
        .find(|line| line.contains("ERROR:"))
    {
        let cleaned = line
            .trim()
            .trim_start_matches("ERROR:")
            .trim()
            .trim_start_matches("[youtube]")
            .trim();
        // Keep it short — drop long URLs/wiki links.
        let short = cleaned.split("http").next().unwrap_or(cleaned).trim();
        if !short.is_empty() && short.len() < 180 {
            return format!("{context}: {short}");
        }
    }

    format!("{context}: Something went wrong. Please try again.")
}

async fn run_yt_dlp_output(app: &AppHandle, args: &[String]) -> Result<(Vec<u8>, Vec<u8>, i32), String> {
    // Prefer official sidecar API when the binary is bundled.
    if bundled_sidecar_path("yt-dlp").is_some() {
        let sidecar = app
            .shell()
            .sidecar("yt-dlp")
            .map_err(|e| format!("Failed to create yt-dlp sidecar: {e}"))?
            .args(args);

        let output = sidecar
            .output()
            .await
            .map_err(|e| format!("Failed to run yt-dlp sidecar: {e}"))?;

        return Ok((output.stdout, output.stderr, output.status.code().unwrap_or(1)));
    }

    let yt_dlp = resolve_tool("yt-dlp").ok_or_else(|| {
        "yt-dlp not found. Run `pnpm sidecars:fetch` or install yt-dlp on PATH.".to_string()
    })?;

    let output = TokioCommand::new(&yt_dlp)
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {e}"))?;

    Ok((
        output.stdout,
        output.stderr,
        output.status.code().unwrap_or(1),
    ))
}

#[tauri::command]
pub async fn check_dependencies() -> Result<serde_json::Value, String> {
    let yt_dlp = resolve_tool("yt-dlp");
    let ffmpeg = resolve_tool("ffmpeg");

    let yt_dlp_ok = match &yt_dlp {
        Some(path) => probe_binary(path, &["--version"]).await,
        None => false,
    };
    let ffmpeg_ok = match &ffmpeg {
        Some(path) => probe_binary(path, &["-version"]).await,
        None => false,
    };

    Ok(serde_json::json!({
        "ytDlp": yt_dlp_ok,
        "ffmpeg": ffmpeg_ok,
        "ytDlpPath": yt_dlp.as_ref().map(|p| p.to_string_lossy().into_owned()),
        "ffmpegPath": ffmpeg.as_ref().map(|p| p.to_string_lossy().into_owned()),
        "ytDlpSource": yt_dlp.as_ref().map(|p| tool_source(p)),
        "ffmpegSource": ffmpeg.as_ref().map(|p| tool_source(p)),
    }))
}

#[tauri::command]
pub async fn fetch_video_info(
    app: AppHandle,
    url: String,
    cookies: Option<CookieOptions>,
) -> Result<VideoInfo, String> {
    let ffmpeg = resolve_tool("ffmpeg");
    let cookies = cookies.unwrap_or_default();
    let mut args = vec![
        "--dump-single-json".to_string(),
        "--no-warnings".to_string(),
        "--no-playlist".to_string(),
    ];
    args.extend(cookie_args(&cookies)?);
    args.extend(ffmpeg_args(ffmpeg.as_deref()));
    args.push(url.clone());

    let (stdout, stderr, code) = run_yt_dlp_output(&app, &args).await?;
    let stderr_text = String::from_utf8_lossy(&stderr);
    let cookies_used = used_browser_cookies(&cookies);
    if code != 0 {
        return Err(user_facing_error(
            "Couldn't fetch video info",
            &stderr_text,
            cookies_used,
        ));
    }
    // yt-dlp sometimes continues after cookie warnings; treat rotated cookies as failure early.
    if cookies_used
        && (stderr_text.contains("cookies are no longer valid")
            || stderr_text.contains("rotated in the browser"))
    {
        return Err(user_facing_error(
            "Couldn't fetch video info",
            &stderr_text,
            true,
        ));
    }

    let raw: YtDlpInfo = serde_json::from_slice(&stdout)
        .map_err(|e| format!("Failed to parse yt-dlp output: {e}"))?;

    Ok(VideoInfo {
        id: raw.id,
        title: raw.title,
        channel: raw.channel.or(raw.uploader),
        duration: raw.duration,
        thumbnail: raw.thumbnail,
        webpage_url: raw.webpage_url.or(raw.original_url).unwrap_or(url),
        formats: pick_formats(raw.formats.unwrap_or_default()),
    })
}

#[tauri::command]
pub async fn download_video(
    app: AppHandle,
    download_id: String,
    url: String,
    output_dir: String,
    format: Option<String>,
    cookies: Option<CookieOptions>,
) -> Result<String, String> {
    let ffmpeg = resolve_tool("ffmpeg");
    let cookies = cookies.unwrap_or_default();
    let format_selector = format.unwrap_or_else(|| "bv*+ba/b".to_string());
    let output_template = format!("{output_dir}/%(title)s [%(id)s].%(ext)s");

    let mut args = vec![
        "--newline".to_string(),
        "--progress".to_string(),
        "--no-warnings".to_string(),
        "--no-playlist".to_string(),
        "-f".to_string(),
        format_selector,
        "--merge-output-format".to_string(),
        "mp4".to_string(),
        "-o".to_string(),
        output_template,
    ];
    args.extend(cookie_args(&cookies)?);
    args.extend(ffmpeg_args(ffmpeg.as_deref()));
    args.push(url);

    let cookies_used = used_browser_cookies(&cookies);

    if bundled_sidecar_path("yt-dlp").is_some() {
        let sidecar = app
            .shell()
            .sidecar("yt-dlp")
            .map_err(|e| format!("Failed to create yt-dlp sidecar: {e}"))?
            .args(args);

        let (mut rx, _child) = sidecar
            .spawn()
            .map_err(|e| format!("Failed to start download: {e}"))?;

        let mut stderr_buf = String::new();
        let mut success = false;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    if let Some(progress) = parse_progress_line(&download_id, &line) {
                        let _ = app.emit("download-progress", progress);
                    }
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    stderr_buf.push_str(&line);
                    stderr_buf.push('\n');
                    if let Some(progress) = parse_progress_line(&download_id, &line) {
                        let _ = app.emit("download-progress", progress);
                    }
                }
                CommandEvent::Terminated(payload) => {
                    success = payload.code.unwrap_or(1) == 0;
                }
                CommandEvent::Error(err) => {
                    stderr_buf.push_str(&err);
                    stderr_buf.push('\n');
                }
                _ => {}
            }
        }

        if !success {
            let message = user_facing_error("Download failed", &stderr_buf, cookies_used);
            let _ = app.emit(
                "download-progress",
                DownloadProgress {
                    download_id: download_id.clone(),
                    percent: 0.0,
                    speed: None,
                    eta: None,
                    status: "error".to_string(),
                    message: Some(message.clone()),
                    output_path: None,
                },
            );
            return Err(message);
        }
    } else {
        let yt_dlp = resolve_tool("yt-dlp").ok_or_else(|| {
            "yt-dlp not found. Run `pnpm sidecars:fetch` or install yt-dlp on PATH.".to_string()
        })?;

        let mut child = TokioCommand::new(&yt_dlp)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start download: {e}"))?;

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

        let app_out = app.clone();
        let id_out = download_id.clone();
        let stdout_task = tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if let Some(progress) = parse_progress_line(&id_out, &line) {
                    let _ = app_out.emit("download-progress", progress);
                }
            }
        });

        let mut err_reader = BufReader::new(stderr).lines();
        let mut stderr_buf = String::new();
        while let Ok(Some(line)) = err_reader.next_line().await {
            stderr_buf.push_str(&line);
            stderr_buf.push('\n');
            if let Some(progress) = parse_progress_line(&download_id, &line) {
                let _ = app.emit("download-progress", progress);
            }
        }

        let status = child
            .wait()
            .await
            .map_err(|e| format!("Download process error: {e}"))?;
        let _ = stdout_task.await;

        if !status.success() {
            let message = user_facing_error("Download failed", &stderr_buf, cookies_used);
            let _ = app.emit(
                "download-progress",
                DownloadProgress {
                    download_id: download_id.clone(),
                    percent: 0.0,
                    speed: None,
                    eta: None,
                    status: "error".to_string(),
                    message: Some(message.clone()),
                    output_path: None,
                },
            );
            return Err(message);
        }
    }

    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            download_id: download_id.clone(),
            percent: 100.0,
            speed: None,
            eta: None,
            status: "completed".to_string(),
            message: None,
            output_path: Some(output_dir),
        },
    );

    Ok(download_id)
}

fn parse_progress_line(download_id: &str, line: &str) -> Option<DownloadProgress> {
    // Example: [download]  45.2% of  12.34MiB at  1.23MiB/s ETA 00:08
    if !line.contains("[download]") || !line.contains('%') {
        return None;
    }

    let percent = line
        .split('%')
        .next()?
        .split_whitespace()
        .last()?
        .parse::<f64>()
        .ok()?;

    let speed = line
        .split(" at ")
        .nth(1)
        .and_then(|s| s.split(" ETA ").next())
        .map(|s| s.trim().to_string());

    let eta = line.split(" ETA ").nth(1).map(|s| s.trim().to_string());

    Some(DownloadProgress {
        download_id: download_id.to_string(),
        percent,
        speed,
        eta,
        status: "downloading".to_string(),
        message: None,
        output_path: None,
    })
}
