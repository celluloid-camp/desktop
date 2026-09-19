//! Detect local browsers that have a YouTube login cookie.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BrowserSession {
    pub id: String,
    pub label: String,
    /// Exact value for yt-dlp `--cookies-from-browser` (e.g. `chrome`).
    pub from_browser: String,
}

const YT_COOKIE_NAMES: &[&str] = &[
    "SID",
    "HSID",
    "SSID",
    "APISID",
    "SAPISID",
    "LOGIN_INFO",
    "__Secure-1PSID",
    "__Secure-3PSID",
    "__Secure-1PSIDTS",
    "__Secure-3PSIDTS",
];

fn home_dir() -> Option<PathBuf> {
    dirs::home_dir()
}

fn support_dir() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        home_dir().map(|h| h.join("Library/Application Support"))
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("LOCALAPPDATA").map(PathBuf::from)
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        home_dir().map(|h| h.join(".config"))
    }
}

fn chromium_roots() -> Vec<(&'static str, &'static str, PathBuf)> {
    let Some(base) = support_dir() else {
        return Vec::new();
    };

    #[cfg(target_os = "macos")]
    {
        vec![
            ("chrome", "Chrome", base.join("Google/Chrome")),
            ("chromium", "Chromium", base.join("Chromium")),
            (
                "brave",
                "Brave",
                base.join("BraveSoftware/Brave-Browser"),
            ),
            ("edge", "Edge", base.join("Microsoft Edge")),
            ("vivaldi", "Vivaldi", base.join("Vivaldi")),
            ("opera", "Opera", base.join("com.operasoftware.Opera")),
        ]
    }

    #[cfg(target_os = "windows")]
    {
        vec![
            ("chrome", "Chrome", base.join("Google/Chrome/User Data")),
            ("chromium", "Chromium", base.join("Chromium/User Data")),
            (
                "brave",
                "Brave",
                base.join("BraveSoftware/Brave-Browser/User Data"),
            ),
            ("edge", "Edge", base.join("Microsoft/Edge/User Data")),
            ("vivaldi", "Vivaldi", base.join("Vivaldi/User Data")),
            ("opera", "Opera", base.join("Opera Software/Opera Stable")),
        ]
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        vec![
            ("chrome", "Chrome", base.join("google-chrome")),
            ("chromium", "Chromium", base.join("chromium")),
            ("brave", "Brave", base.join("BraveSoftware/Brave-Browser")),
            ("edge", "Edge", base.join("microsoft-edge")),
            ("vivaldi", "Vivaldi", base.join("vivaldi")),
            ("opera", "Opera", base.join("opera")),
        ]
    }
}

fn firefox_root() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        support_dir().map(|b| b.join("Firefox"))
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA").map(|a| PathBuf::from(a).join("Mozilla/Firefox"))
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        home_dir().map(|h| h.join(".mozilla/firefox"))
    }
}

fn safari_cookie_paths() -> Vec<PathBuf> {
    let Some(home) = home_dir() else {
        return Vec::new();
    };
    vec![
        home.join("Library/Cookies/Cookies.binarycookies"),
        home.join(
            "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
        ),
    ]
}

fn chromium_profile_dirs(root: &Path) -> Vec<PathBuf> {
    if !root.is_dir() {
        return Vec::new();
    }

    let mut profiles = Vec::new();
    let default = root.join("Default");
    if default.is_dir() {
        profiles.push(default);
    }

    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name.starts_with("Profile ") {
                let path = entry.path();
                if path.is_dir() {
                    profiles.push(path);
                }
            }
        }
    }

    profiles
}

/// Copy a SQLite DB (and WAL if present) so we can read while the browser is open.
fn copy_db_for_read(src: &Path) -> Option<tempfile::NamedTempFile> {
    if !src.is_file() {
        return None;
    }
    let tmp = tempfile::NamedTempFile::new().ok()?;
    fs::copy(src, tmp.path()).ok()?;
    let wal = PathBuf::from(format!("{}-wal", src.display()));
    if wal.is_file() {
        let wal_dest = PathBuf::from(format!("{}-wal", tmp.path().display()));
        let _ = fs::copy(&wal, &wal_dest);
    }
    Some(tmp)
}

fn query_has_youtube_cookies(db_path: &Path, table: &str, host_column: &str) -> bool {
    let Ok(conn) = rusqlite::Connection::open_with_flags(
        db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    ) else {
        return false;
    };

    let placeholders = YT_COOKIE_NAMES
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT 1 FROM {table}
         WHERE ({host_column} = '.youtube.com'
             OR {host_column} = 'youtube.com'
             OR {host_column} LIKE '%.youtube.com')
           AND name IN ({placeholders})
         LIMIT 1"
    );

    let Ok(mut stmt) = conn.prepare(&sql) else {
        return false;
    };
    stmt.exists(rusqlite::params_from_iter(YT_COOKIE_NAMES.iter()))
        .unwrap_or(false)
}

fn chromium_has_youtube_session(profile: &Path) -> bool {
    let cookies = profile.join("Cookies");
    let Some(tmp) = copy_db_for_read(&cookies) else {
        return false;
    };
    query_has_youtube_cookies(tmp.path(), "cookies", "host_key")
}

fn firefox_has_youtube_session(profile: &Path) -> bool {
    let cookies = profile.join("cookies.sqlite");
    let Some(tmp) = copy_db_for_read(&cookies) else {
        return false;
    };
    query_has_youtube_cookies(tmp.path(), "moz_cookies", "host")
}

fn firefox_profiles(root: &Path) -> Vec<PathBuf> {
    let profiles_dir = root.join("Profiles");
    let mut out = Vec::new();

    if profiles_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&profiles_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && path.join("cookies.sqlite").is_file() {
                    out.push(path);
                }
            }
        }
    }

    if out.is_empty() && root.is_dir() {
        if let Ok(entries) = fs::read_dir(root) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && path.join("cookies.sqlite").is_file() {
                    out.push(path);
                }
            }
        }
    }

    out
}

fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
    haystack
        .windows(needle.len())
        .any(|window| window == needle)
}

fn safari_has_youtube_session() -> bool {
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
    #[cfg(target_os = "macos")]
    {
        for path in safari_cookie_paths() {
            let Ok(bytes) = fs::read(&path) else {
                continue;
            };
            if !contains_bytes(&bytes, b"youtube.com") {
                continue;
            }
            let auth_markers: &[&[u8]] = &[
                b"LOGIN_INFO",
                b"__Secure-1PSID",
                b"__Secure-3PSID",
                b"SAPISID",
                b"SID",
            ];
            if auth_markers
                .iter()
                .any(|marker| contains_bytes(&bytes, marker))
            {
                return true;
            }
        }
        false
    }
}

#[tauri::command]
pub fn list_youtube_browser_sessions() -> Result<Vec<BrowserSession>, String> {
    let mut sessions = Vec::new();

    for (id, label, root) in chromium_roots() {
        if !root.is_dir() {
            continue;
        }
        let has = chromium_profile_dirs(&root)
            .into_iter()
            .any(|profile| chromium_has_youtube_session(&profile));
        if has {
            sessions.push(BrowserSession {
                id: id.to_string(),
                label: label.to_string(),
                from_browser: id.to_string(),
            });
        }
    }

    if let Some(ff) = firefox_root() {
        if ff.is_dir()
            && firefox_profiles(&ff)
                .into_iter()
                .any(|profile| firefox_has_youtube_session(&profile))
        {
            sessions.push(BrowserSession {
                id: "firefox".to_string(),
                label: "Firefox".to_string(),
                from_browser: "firefox".to_string(),
            });
        }
    }

    if safari_has_youtube_session() {
        sessions.push(BrowserSession {
            id: "safari".to_string(),
            label: "Safari".to_string(),
            from_browser: "safari".to_string(),
        });
    }

    sessions.sort_by(|a, b| a.label.cmp(&b.label));
    Ok(sessions)
}
