mod config;
mod github;
mod notify;
mod panel;
mod poller;
mod state;
mod tray;

use github::GitHubClient;
use state::{AppState, SharedState};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tokio::sync::Notify;

#[tauri::command]
async fn save_pat(
    state: tauri::State<'_, SharedState>,
    trigger: tauri::State<'_, Arc<Notify>>,
    pat: String,
) -> Result<String, String> {
    let client = GitHubClient::new(&pat)?;
    let login = client.validate_pat().await?;

    {
        let mut s = state.lock().unwrap();
        s.config.github_pat = pat;
        s.config.save(&s.config_dir)?;
        s.auth_error = false;
    }

    trigger.notify_one();
    Ok(login)
}

#[tauri::command]
fn get_config(state: tauri::State<'_, SharedState>) -> config::Config {
    let s = state.lock().unwrap();
    s.config.clone()
}

#[tauri::command]
async fn get_repos(
    state: tauri::State<'_, SharedState>,
) -> Result<Vec<github::GitHubRepo>, String> {
    let pat = {
        let s = state.lock().unwrap();
        s.config.github_pat.clone()
    };

    if pat.is_empty() {
        return Err("No PAT configured".to_string());
    }

    let client = GitHubClient::new(&pat)?;
    client.get_user_repos().await
}

#[tauri::command]
fn set_watched_repos(
    state: tauri::State<'_, SharedState>,
    trigger: tauri::State<'_, Arc<Notify>>,
    repos: Vec<String>,
) -> Result<(), String> {
    {
        let mut s = state.lock().unwrap();
        s.config.watched_repos = repos;
        s.config.save(&s.config_dir)?;
    }
    trigger.notify_one();
    Ok(())
}

#[tauri::command]
fn get_workflow_runs(state: tauri::State<'_, SharedState>) -> state::PanelPayload {
    let s = state.lock().unwrap();
    s.panel_payload()
}

#[tauri::command]
fn open_settings(app: tauri::AppHandle) {
    tray::open_settings_window(&app);
}

#[tauri::command]
fn open_about(app: tauri::AppHandle) {
    tray::open_about_window(&app);
}

#[tauri::command]
fn quit_app() {
    std::process::exit(0);
}

#[tauri::command]
fn open_url(url: String) {
    tray::open_url_in_browser(&url);
}

#[tauri::command]
fn hide_panel(app: tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("panel") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn set_panel_width(app: tauri::AppHandle, width: u32) -> Result<(), String> {
    use tauri::{LogicalPosition, LogicalSize, Manager};
    let window = app
        .get_webview_window("panel")
        .ok_or_else(|| "panel window not found".to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;

    let cur_w_logical = size.width as f64 / scale;
    let cur_h_logical = size.height as f64 / scale;
    let pos_x_logical = pos.x as f64 / scale;
    let pos_y_logical = pos.y as f64 / scale;
    let new_w_logical = width as f64;
    let new_x_logical = pos_x_logical - ((new_w_logical - cur_w_logical) / 2.0);

    window
        .set_size(LogicalSize::new(new_w_logical, cur_h_logical))
        .map_err(|e| e.to_string())?;
    window
        .set_position(LogicalPosition::new(new_x_logical, pos_y_logical))
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let config_dir = app
                .path()
                .app_config_dir()
                .expect("failed to get config dir");

            let shared_state: SharedState =
                Arc::new(Mutex::new(AppState::new(config_dir)));
            app.manage(shared_state.clone());

            let poll_trigger = Arc::new(Notify::new());
            app.manage(poll_trigger.clone());

            let _tray_icon = tray::create_tray(app.handle())?;
            panel::setup_panel(app.handle());

            poller::start_polling(
                app.handle().clone(),
                poll_trigger,
                shared_state,
            );

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_pat,
            get_config,
            get_repos,
            set_watched_repos,
            get_workflow_runs,
            open_settings,
            open_about,
            quit_app,
            open_url,
            hide_panel,
            set_panel_width,
        ])
        .build(tauri::generate_context!())
        .expect("error while building ghast")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
