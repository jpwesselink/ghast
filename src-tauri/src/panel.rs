use crate::state::SharedState;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, Rect};

const DEFAULT_PANEL_WIDTH: f64 = 280.0;
const PANEL_LABEL: &str = "panel";

/// Tray anchor in physical pixels: (center x of the tray icon, panel top y).
/// Remembered when the panel opens so resizes can stay centered under the icon.
#[derive(Default)]
pub struct PanelAnchor(Mutex<Option<(f64, f64)>>);

fn rect_position(rect: &Rect) -> (f64, f64) {
    match &rect.position {
        tauri::Position::Physical(p) => (p.x as f64, p.y as f64),
        tauri::Position::Logical(p) => (p.x, p.y),
    }
}

fn rect_size(rect: &Rect) -> (f64, f64) {
    match &rect.size {
        tauri::Size::Physical(s) => (s.width as f64, s.height as f64),
        tauri::Size::Logical(s) => (s.width, s.height),
    }
}

fn panel_position(rect: &Rect, panel_width: f64) -> (f64, f64) {
    let (px, py) = rect_position(rect);
    let (sw, sh) = rect_size(rect);
    let panel_x = px + (sw / 2.0) - (panel_width / 2.0);
    let panel_y = py + sh + 4.0;
    (panel_x, panel_y)
}

/// Ask NSApplication to activate, which causes other apps' open menus to close.
/// This works without changing the activation policy or requiring accessibility permissions.
#[cfg(target_os = "macos")]
fn activate_to_dismiss_other_menus() {
    use objc::runtime::{Object, YES};
    use objc::{class, msg_send, sel, sel_impl};
    unsafe {
        let ns_app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
        let _: () = msg_send![ns_app, activateIgnoringOtherApps: YES];
    }
}

pub fn toggle_panel(app: &AppHandle, rect: Rect) {
    if let Some(window) = app.get_webview_window(PANEL_LABEL) {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            // Restore the user's panel size before anchoring, if one is stored.
            if let Some(state) = app.try_state::<SharedState>() {
                let stored = {
                    let s = state.lock().unwrap();
                    (s.config.panel_width, s.config.panel_height)
                };
                if let (Some(w), Some(h)) = stored {
                    let _ = window.set_size(LogicalSize::new(w, h));
                }
            }

            // Tray rect on macOS is reported in physical pixels. Compute
            // everything in physical pixels so set_position lines up.
            let scale = window.scale_factor().unwrap_or(1.0);
            let panel_width_physical = window
                .outer_size()
                .map(|s| s.width as f64)
                .unwrap_or(DEFAULT_PANEL_WIDTH * scale);
            let (x, y) = panel_position(&rect, panel_width_physical);

            if let Some(anchor) = app.try_state::<PanelAnchor>() {
                let (px, _) = rect_position(&rect);
                let (sw, _) = rect_size(&rect);
                *anchor.0.lock().unwrap() = Some((px + sw / 2.0, y));
            }

            let _ = window.set_position(PhysicalPosition::new(x, y));

            #[cfg(target_os = "macos")]
            activate_to_dismiss_other_menus();

            let _ = window.show();
            let _ = window.set_focus();

            // fresh data the moment the panel opens
            if let Some(trigger) = app.try_state::<std::sync::Arc<tokio::sync::Notify>>() {
                trigger.notify_one();
            }
        }
    }
}

pub fn setup_panel(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(PANEL_LABEL) {
        #[cfg(target_os = "macos")]
        {
            use objc::runtime::{Object, NO};
            use objc::{class, msg_send, sel, sel_impl};

            if let Ok(ns_win) = window.ns_window() {
                unsafe {
                    let ns_win = ns_win as *mut Object;

                    // Make the window background transparent
                    let clear: *mut Object = msg_send![class!(NSColor), clearColor];
                    let _: () = msg_send![ns_win, setBackgroundColor: clear];
                    let _: () = msg_send![ns_win, setOpaque: NO];

                    // Round the content view at the native layer level
                    let content_view: *mut Object = msg_send![ns_win, contentView];
                    let _: () = msg_send![content_view, setWantsLayer: true];
                    let layer: *mut Object = msg_send![content_view, layer];
                    if !layer.is_null() {
                        let _: () = msg_send![layer, setCornerRadius: 14.0_f64];
                        let _: () = msg_send![layer, setMasksToBounds: true];
                    }
                }
            }
        }

        let win = window.clone();
        let app_handle = app.clone();
        window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Focused(false) => {
                    // Persist the panel size once, on close, not per resize tick.
                    if let Some(state) = app_handle.try_state::<SharedState>() {
                        let s = state.lock().unwrap();
                        if s.config.panel_width.is_some() {
                            let _ = s.config.save(&s.config_dir);
                        }
                    }
                    let _ = win.hide();
                }
                // Keep the panel centered under the tray icon while resizing,
                // and remember the size in memory.
                tauri::WindowEvent::Resized(size) => {
                    if !win.is_visible().unwrap_or(false) {
                        return;
                    }

                    let scale = win.scale_factor().unwrap_or(1.0);
                    if let Some(state) = app_handle.try_state::<SharedState>() {
                        let logical = size.to_logical::<f64>(scale);
                        let mut s = state.lock().unwrap();
                        s.config.panel_width = Some(logical.width);
                        s.config.panel_height = Some(logical.height);
                    }

                    let Some(anchor) = app_handle.try_state::<PanelAnchor>() else {
                        return;
                    };
                    let Some((center_x, top_y)) = *anchor.0.lock().unwrap() else {
                        return;
                    };
                    let x = center_x - size.width as f64 / 2.0;
                    let _ = win.set_position(PhysicalPosition::new(x, top_y));
                }
                _ => {}
            }
        });
        let _ = window.hide();
    }
}

pub fn emit_panel_update(app: &AppHandle, payload: &crate::state::PanelPayload) {
    let _ = app.emit("workflow-runs-updated", payload);
}
