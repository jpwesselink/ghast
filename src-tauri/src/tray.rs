use crate::state::SharedState;
use tauri::image::Image;
use tauri::tray::{TrayIcon, TrayIconBuilder};
use tauri::AppHandle;

pub fn create_tray(app: &AppHandle) -> tauri::Result<TrayIcon> {
    let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))?;
    let tray = TrayIconBuilder::with_id("ghast-tray")
        .icon(icon)
        .tooltip("ghast - GitHub Actions Ghost")
        .icon_as_template(true)
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                rect,
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                crate::panel::toggle_panel(tray.app_handle(), rect);
            }
        })
        .build(app)?;

    Ok(tray)
}

pub fn open_url_in_browser(url: &str) {
    let _ = open::that(url);
}

pub fn open_settings_window(app: &AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.set_focus();
    } else {
        let _ = tauri::WebviewWindowBuilder::new(
            app,
            "settings",
            tauri::WebviewUrl::App("index.html?view=settings".into()),
        )
        .title("ghast Settings")
        .resizable(true)
        .build();

        if let Some(win) = app.get_webview_window("settings") {
            let _ = win.set_size(tauri::LogicalSize::new(740.0, 620.0));
            let w = win.clone();
            win.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = w.close();
                }
            });
        }
    }
}

pub fn open_about_window(app: &AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.set_focus();
    } else {
        let _ = tauri::WebviewWindowBuilder::new(
            app,
            "about",
            tauri::WebviewUrl::App("index.html?view=about".into()),
        )
        .title("About ghast")
        .resizable(false)
        .build();

        if let Some(win) = app.get_webview_window("about") {
            let _ = win.set_size(tauri::LogicalSize::new(380.0, 520.0));
            let w = win.clone();
            win.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = w.close();
                }
            });
        }
    }
}

pub fn update_tray_badge(
    tray: &TrayIcon,
    state: &SharedState,
) -> tauri::Result<()> {
    let state = state.lock().unwrap();
    let count = state.badge_count();
    if count > 0 {
        tray.set_title(Some(&count.to_string()))?;
    } else {
        tray.set_title(Some(""))?;
    }
    Ok(())
}

