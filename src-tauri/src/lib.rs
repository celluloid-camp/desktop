mod app_menu;
mod browsers;
mod download;
mod window_size;
mod window_vibrancy;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app_menu::install_app_menu(app)?;
            if let Some(window) = app.get_webview_window("main") {
                window_size::apply_window_size(&window)?;
                window_vibrancy::apply_window_background(&window)?;
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            app_menu::handle_menu_event(&app, &event);
        })
        .invoke_handler(tauri::generate_handler![
            browsers::list_youtube_browser_sessions,
            download::check_dependencies,
            download::fetch_video_info,
            download::download_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
