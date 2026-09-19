//! macOS / Windows window vibrancy (blur-behind).
//!
//! Keep the NSWindow opaque (`transparent: false`). Apply a native light blur
//! layer, then make only the WKWebView canvas transparent so the Celluloid
//! `#F9FAFC` CSS wash shows through as frosted glass.

use tauri::WebviewWindow;

pub fn apply_window_vibrancy(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

        // Light frosted material — pairs with the #F9FAFC CSS wash.
        apply_vibrancy(
            window,
            NSVisualEffectMaterial::UnderWindowBackground,
            Some(NSVisualEffectState::Active),
            None,
        )?;

        let webview: &tauri::Webview<_> = window.as_ref();
        webview.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)))?;
    }

    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::apply_acrylic;

        // Celluloid web app palette.background.default (#F9FAFC).
        let _ = apply_acrylic(window, Some((249, 250, 252, 200)));

        let webview: &tauri::Webview<_> = window.as_ref();
        let _ = webview.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = window;
    }

    Ok(())
}
