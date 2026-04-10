use crate::state::SharedState;
use chrono::{DateTime, Utc};
use tauri::image::Image;
use tauri::tray::{TrayIcon, TrayIconBuilder};
use tauri::AppHandle;

pub fn format_time_ago(dt: DateTime<Utc>) -> String {
    let now = Utc::now();
    let diff = now - dt;

    if diff.num_seconds() < 60 {
        "just now".to_string()
    } else if diff.num_minutes() < 60 {
        format!("{}m ago", diff.num_minutes())
    } else if diff.num_hours() < 24 {
        format!("{}h ago", diff.num_hours())
    } else {
        format!("{}d ago", diff.num_days())
    }
}

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
            let _ = win.set_size(tauri::LogicalSize::new(560.0, 900.0));
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
            let _ = win.set_size(tauri::LogicalSize::new(340.0, 420.0));
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeDelta;

    #[test]
    fn test_format_time_ago_just_now() {
        let dt = Utc::now() - TimeDelta::seconds(30);
        assert_eq!(format_time_ago(dt), "just now");
    }

    #[test]
    fn test_format_time_ago_minutes() {
        let dt = Utc::now() - TimeDelta::minutes(5);
        assert_eq!(format_time_ago(dt), "5m ago");
    }

    #[test]
    fn test_format_time_ago_hours() {
        let dt = Utc::now() - TimeDelta::hours(3);
        assert_eq!(format_time_ago(dt), "3h ago");
    }

    #[test]
    fn test_format_time_ago_days() {
        let dt = Utc::now() - TimeDelta::days(2);
        assert_eq!(format_time_ago(dt), "2d ago");
    }
}
