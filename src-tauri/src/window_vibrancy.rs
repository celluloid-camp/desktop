//! Solid window background (Celluloid peach `#FFE7DB`).

use tauri::WebviewWindow;

/// Brand peach `#FFE7DB`.
const BACKGROUND: tauri::window::Color = tauri::window::Color(255, 231, 219, 255);

pub fn apply_window_background(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    let webview: &tauri::Webview<_> = window.as_ref();
    webview.set_background_color(Some(BACKGROUND))?;
    Ok(())
}
