//! Keep the configured window size — macOS otherwise restores the last frame
//! and can ignore `tauri.conf.json` width/height on relaunch.

use tauri::{LogicalSize, Size, WebviewWindow};

pub const WINDOW_WIDTH: f64 = 800.0;
pub const WINDOW_HEIGHT: f64 = 1080.0;
pub const WINDOW_MIN_WIDTH: f64 = 640.0;
pub const WINDOW_MIN_HEIGHT: f64 = 600.0;

pub fn apply_window_size(window: &WebviewWindow) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        // Stop AppKit from re-applying a previous session's frame.
        if let Ok(ptr) = window.ns_window() {
            let ns_window = unsafe { &*ptr.cast::<objc2_app_kit::NSWindow>() };
            ns_window.setRestorable(false);
        }
    }

    window.set_size(Size::Logical(LogicalSize::new(WINDOW_WIDTH, WINDOW_HEIGHT)))?;
    window.set_min_size(Some(Size::Logical(LogicalSize::new(
        WINDOW_MIN_WIDTH,
        WINDOW_MIN_HEIGHT,
    ))))?;

    Ok(())
}
