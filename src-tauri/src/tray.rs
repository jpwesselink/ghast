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

fn base_icon() -> tauri::Result<Image<'static>> {
    Image::from_bytes(include_bytes!("../icons/32x32.png"))
}

/// The ghost, seeing red: every opaque pixel of the template icon tinted.
fn failing_icon() -> tauri::Result<Image<'static>> {
    let base = base_icon()?;
    let mut rgba = base.rgba().to_vec();
    for px in rgba.chunks_exact_mut(4) {
        if px[3] > 0 {
            px[0] = 204;
            px[1] = 24;
            px[2] = 24;
        }
    }
    Ok(Image::new_owned(rgba, base.width(), base.height()))
}

pub fn update_tray_badge(
    tray: &TrayIcon,
    state: &SharedState,
) -> tauri::Result<()> {
    let (active, reviews, mentions, failing) = {
        let s = state.lock().unwrap();
        (
            s.active_run_count(),
            s.pending_reviews.len(),
            s.mentions.len(),
            s.has_failing(),
        )
    };

    let mut parts: Vec<String> = Vec::new();
    if active > 0 {
        parts.push(format!("⟳{active}"));
    }
    if reviews > 0 {
        parts.push(format!("◉{reviews}"));
    }
    if mentions > 0 {
        parts.push(format!("@{mentions}"));
    }
    tray.set_title(Some(parts.join(" ")))?;

    if failing {
        tray.set_icon(Some(failing_icon()?))?;
        tray.set_icon_as_template(false)?;
    } else {
        tray.set_icon(Some(base_icon()?))?;
        tray.set_icon_as_template(true)?;
    }
    Ok(())
}

