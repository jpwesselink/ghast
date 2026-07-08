mod config;
mod github;
mod keychain;
mod notify;
mod panel;
mod poller;
mod state;
mod tray;

use github::GitHubClient;
use state::{AppState, SharedState};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;
use tokio::sync::Notify;

#[tauri::command]
async fn save_pat(
    state: tauri::State<'_, SharedState>,
    trigger: tauri::State<'_, Arc<Notify>>,
    pat: String,
) -> Result<String, String> {
    let client = GitHubClient::new(&pat)?;
    let login = client.validate_pat().await?;
    keychain::save_pat(&pat)?;

    {
        let mut s = state.lock().unwrap();
        s.github_pat = pat;
        s.auth_error = false;
    }

    trigger.notify_one();
    Ok(login)
}

#[derive(serde::Serialize)]
struct ConfigResponse {
    has_pat: bool,
    watched_repos: Vec<String>,
    review_repos: Vec<String>,
    mention_repos: Vec<String>,
    poll_interval_secs: u64,
    theme: String,
    font_scale: f64,
    focus_expand_runs: u32,
    runs_per_repo: u32,
    panel_width: Option<f64>,
}

#[tauri::command]
fn get_config(state: tauri::State<'_, SharedState>) -> ConfigResponse {
    let s = state.lock().unwrap();
    ConfigResponse {
        has_pat: !s.github_pat.is_empty(),
        watched_repos: s.config.watched_repos.clone(),
        review_repos: s.config.review_repos.clone(),
        mention_repos: s.config.mention_repos.clone(),
        poll_interval_secs: s.config.poll_interval_secs,
        theme: s.config.theme.clone(),
        font_scale: s.config.font_scale,
        focus_expand_runs: s.config.focus_expand_runs,
        runs_per_repo: s.config.runs_per_repo,
        panel_width: s.config.panel_width,
    }
}

#[derive(serde::Serialize, Clone)]
struct UiPrefs {
    font_scale: f64,
    focus_expand_runs: u32,
}

#[tauri::command]
fn set_ui_prefs(
    app: tauri::AppHandle,
    state: tauri::State<'_, SharedState>,
    trigger: tauri::State<'_, Arc<Notify>>,
    font_scale: f64,
    focus_expand_runs: u32,
    runs_per_repo: u32,
) -> Result<(), String> {
    let font_scale = font_scale.clamp(0.7, 2.0);
    let focus_expand_runs = focus_expand_runs.clamp(1, 5);
    let runs_per_repo = runs_per_repo.clamp(1, 10);
    let refetch = {
        let mut s = state.lock().unwrap();
        let refetch = s.config.runs_per_repo != runs_per_repo;
        s.config.font_scale = font_scale;
        s.config.focus_expand_runs = focus_expand_runs;
        s.config.runs_per_repo = runs_per_repo;
        s.config.save(&s.config_dir)?;
        refetch
    };
    if refetch {
        trigger.notify_one();
    }
    use tauri::Emitter;
    app.emit("ui-prefs-changed", UiPrefs { font_scale, focus_expand_runs })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_theme(state: tauri::State<'_, SharedState>) -> String {
    let s = state.lock().unwrap();
    s.config.theme.clone()
}

#[tauri::command]
fn set_theme(
    app: tauri::AppHandle,
    state: tauri::State<'_, SharedState>,
    theme: String,
) -> Result<(), String> {
    {
        let mut s = state.lock().unwrap();
        s.config.theme = theme.clone();
        s.config.save(&s.config_dir)?;
    }
    use tauri::Emitter;
    app.emit("theme-changed", theme)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_repos(
    state: tauri::State<'_, SharedState>,
) -> Result<Vec<github::GitHubRepo>, String> {
    let pat = {
        let s = state.lock().unwrap();
        s.github_pat.clone()
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
fn set_review_repos(
    state: tauri::State<'_, SharedState>,
    trigger: tauri::State<'_, Arc<Notify>>,
    repos: Vec<String>,
) -> Result<(), String> {
    {
        let mut s = state.lock().unwrap();
        s.config.review_repos = repos;
        s.first_review_poll = true; // reset baseline to avoid spurious notifications on next poll
        s.config.save(&s.config_dir)?;
    }
    trigger.notify_one();
    Ok(())
}

#[tauri::command]
fn set_mention_repos(
    state: tauri::State<'_, SharedState>,
    trigger: tauri::State<'_, Arc<Notify>>,
    repos: Vec<String>,
) -> Result<(), String> {
    {
        let mut s = state.lock().unwrap();
        s.config.mention_repos = repos;
        s.first_mention_poll = true; // reset baseline to avoid spurious notifications on next poll
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
async fn get_pr_title(
    state: tauri::State<'_, SharedState>,
    repo: String,
    number: u64,
) -> Result<String, String> {
    let pat = {
        let s = state.lock().unwrap();
        s.github_pat.clone()
    };
    if pat.is_empty() {
        return Err("No PAT configured".to_string());
    }
    let (owner, name) = repo
        .split_once('/')
        .ok_or_else(|| format!("bad repo: {repo}"))?;
    let client = GitHubClient::new(&pat)?;
    client.get_pr_title(owner, name, number).await
}

#[tauri::command]
async fn get_run_jobs(
    state: tauri::State<'_, SharedState>,
    repo: String,
    run_id: u64,
) -> Result<Vec<github::RunJob>, String> {
    let pat = {
        let s = state.lock().unwrap();
        s.github_pat.clone()
    };
    if pat.is_empty() {
        return Err("No PAT configured".to_string());
    }
    let (owner, name) = repo
        .split_once('/')
        .ok_or_else(|| format!("bad repo: {repo}"))?;
    let client = GitHubClient::new(&pat)?;
    client.get_run_jobs(owner, name, run_id).await
}

/// System accent color (NSColor.controlAccentColor) as a hex string.
/// The CSS `AccentColor` keyword resolves to stock blue inside WKWebView,
/// so the frontend asks for the real value instead.
#[tauri::command]
fn get_accent_color() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        use objc::runtime::Object;
        use objc::{class, msg_send, sel, sel_impl};
        unsafe {
            let color: *mut Object = msg_send![class!(NSColor), controlAccentColor];
            let srgb: *mut Object = msg_send![class!(NSColorSpace), sRGBColorSpace];
            let color: *mut Object = msg_send![color, colorUsingColorSpace: srgb];
            if color.is_null() {
                return None;
            }
            let r: f64 = msg_send![color, redComponent];
            let g: f64 = msg_send![color, greenComponent];
            let b: f64 = msg_send![color, blueComponent];
            return Some(format!(
                "#{:02x}{:02x}{:02x}",
                (r * 255.0).round() as u8,
                (g * 255.0).round() as u8,
                (b * 255.0).round() as u8
            ));
        }
    }
    #[cfg(not(target_os = "macos"))]
    None
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
fn show_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
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

            let shared_state: SharedState = Arc::new(Mutex::new(AppState::new(config_dir)));
            app.manage(shared_state.clone());

            let poll_trigger = Arc::new(Notify::new());
            app.manage(poll_trigger.clone());

            app.manage(panel::PanelAnchor::default());
            let _tray_icon = tray::create_tray(app.handle())?;
            panel::setup_panel(app.handle());

            poller::start_polling(app.handle().clone(), poll_trigger, shared_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_pat,
            get_config,
            get_theme,
            set_theme,
            get_repos,
            set_watched_repos,
            set_review_repos,
            set_mention_repos,
            set_ui_prefs,
            get_accent_color,
            get_run_jobs,
            get_pr_title,
            get_workflow_runs,
            open_settings,
            open_about,
            quit_app,
            open_url,
            show_notification,
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
