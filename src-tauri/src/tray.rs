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

const CHROME_TAB_SCRIPT: &str = r#"
on run argv
    set matchPrefix to item 1 of argv
    set targetURL to item 2 of argv
    tell application "Google Chrome"
        activate
        if (count of windows) = 0 then
            make new window
            set URL of active tab of window 1 to targetURL
            return
        end if
        repeat with w in windows
            set i to 0
            repeat with t in tabs of w
                set i to i + 1
                if URL of t starts with matchPrefix then
                    set URL of t to targetURL
                    set active tab index of w to i
                    set index of w to 1
                    return
                end if
            end repeat
        end repeat
        tell window 1 to make new tab with properties {URL:targetURL}
    end tell
end run
"#;

/// Reuse one browser tab per repo: if a tab is already on this repo,
/// retarget and focus it; otherwise open a new tab. Falls back to a plain
/// open when Chrome isn't around to be scripted.
pub fn open_url_in_repo_tab(repo: &str, url: &str) {
    let prefix = format!("https://github.com/{repo}");
    let url = url.to_string();
    std::thread::spawn(move || {
        let chrome_present = std::path::Path::new("/Applications/Google Chrome.app").exists();
        if chrome_present {
            let status = std::process::Command::new("osascript")
                .arg("-e")
                .arg(CHROME_TAB_SCRIPT)
                .arg(&prefix)
                .arg(&url)
                .status();
            if matches!(status, Ok(s) if s.success()) {
                return;
            }
        }
        let _ = open::that(&url);
    });
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
        .min_inner_size(600.0, 420.0)
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

#[cfg(target_os = "macos")]
fn menu_bar_is_dark() -> bool {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};
    unsafe {
        let app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
        let appearance: *mut Object = msg_send![app, effectiveAppearance];
        if appearance.is_null() {
            return true;
        }
        let name: *mut Object = msg_send![appearance, name];
        if name.is_null() {
            return true;
        }
        let utf8: *const std::os::raw::c_char = msg_send![name, UTF8String];
        std::ffi::CStr::from_ptr(utf8)
            .to_string_lossy()
            .contains("Dark")
    }
}

#[cfg(not(target_os = "macos"))]
fn menu_bar_is_dark() -> bool {
    true
}

/// The ghost, haunted: solid body with glowing red eyes. The eye holes sit
/// at (42,40) and (62,40) with r=7 in the icon's 100-unit viewBox (ghost.svg).
fn failing_icon() -> tauri::Result<Image<'static>> {
    let base = base_icon()?;
    let (w, h) = (base.width(), base.height());
    let mut rgba = base.rgba().to_vec();

    let body: [u8; 3] = if menu_bar_is_dark() {
        [235, 235, 240]
    } else {
        [28, 28, 32]
    };
    for px in rgba.chunks_exact_mut(4) {
        if px[3] > 0 {
            px[0] = body[0];
            px[1] = body[1];
            px[2] = body[2];
        }
    }

    let s = w as f64 / 100.0;
    let eyes = [(42.0 * s, 40.0 * (h as f64 / 100.0)), (62.0 * s, 40.0 * (h as f64 / 100.0))];
    let r = 7.0 * s;
    for y in 0..h {
        for x in 0..w {
            let (fx, fy) = (x as f64 + 0.5, y as f64 + 0.5);
            if eyes
                .iter()
                .any(|(ex, ey)| (fx - ex).powi(2) + (fy - ey).powi(2) <= r * r)
            {
                let i = ((y * w + x) * 4) as usize;
                rgba[i] = 224;
                rgba[i + 1] = 28;
                rgba[i + 2] = 28;
                rgba[i + 3] = 255;
            }
        }
    }

    Ok(Image::new_owned(rgba, w, h))
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

