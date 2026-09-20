//! Native application menu (macOS menu bar).

use tauri::{
    menu::{MenuBuilder, MenuItem, SubmenuBuilder},
    App, Emitter, Runtime,
};

pub const CHECK_FOR_UPDATES_ID: &str = "check-for-updates";
pub const CHECK_FOR_UPDATES_EVENT: &str = "menu://check-for-updates";

pub fn install_app_menu<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let check_updates = MenuItem::with_id(
        app,
        CHECK_FOR_UPDATES_ID,
        "Check for Updates…",
        true,
        None::<&str>,
    )?;

    let app_menu = SubmenuBuilder::new(app, "Celluloid Desktop")
        .about(None)
        .separator()
        .item(&check_updates)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&app_menu)
        .item(&edit_menu)
        .item(&window_menu)
        .build()?;

    app.set_menu(menu)?;
    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &tauri::AppHandle<R>, event: &tauri::menu::MenuEvent) {
    if event.id().as_ref() == CHECK_FOR_UPDATES_ID {
        let _ = app.emit(CHECK_FOR_UPDATES_EVENT, ());
    }
}
