use crate::github::GitHubClient;
use crate::notify;
use crate::panel;
use crate::state::{SharedState, WorkflowRun};
use crate::tray::update_tray_badge;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Notify;

pub fn start_polling(
    app: tauri::AppHandle,
    trigger: Arc<Notify>,
    state: SharedState,
) {
    tauri::async_runtime::spawn(async move {
        poll_once(&app, &state).await;

        let interval_secs = {
            let s = state.lock().unwrap();
            s.config.poll_interval_secs
        };
        let mut interval = tokio::time::interval(Duration::from_secs(interval_secs));
        interval.tick().await; // skip immediate first tick

        loop {
            tokio::select! {
                _ = interval.tick() => {},
                _ = trigger.notified() => {},
            }
            poll_once(&app, &state).await;
        }
    });
}

async fn poll_once(app: &tauri::AppHandle, state: &SharedState) {
    let (pat, repos) = {
        let s = state.lock().unwrap();
        (s.github_pat.clone(), s.config.watched_repos.clone())
    };

    if pat.is_empty() || repos.is_empty() {
        rebuild(app, state);
        return;
    }

    let client = match GitHubClient::new(&pat) {
        Ok(c) => c,
        Err(_) => {
            let mut s = state.lock().unwrap();
            s.auth_error = true;
            rebuild(app, state);
            return;
        }
    };

    for repo in &repos {
        let parts: Vec<&str> = repo.splitn(2, '/').collect();
        if parts.len() != 2 {
            continue;
        }
        let (owner, name) = (parts[0], parts[1]);

        match client.get_workflow_runs(owner, name).await {
            Ok(api_runs) => {
                let runs: Vec<WorkflowRun> = api_runs
                    .iter()
                    .map(|r| WorkflowRun::from_api(repo, r))
                    .collect();

                let mut s = state.lock().unwrap();
                if !s.first_poll {
                    let old_runs = s.runs.get(repo).map(|r| r.as_slice());
                    let completed = notify::detect_completions(old_runs, &runs);
                    for run in &completed {
                        notify::send_completion_notification(app, run);
                    }
                }
                s.runs.insert(repo.clone(), runs);
                s.auth_error = false;
            }
            Err(e) if e == "auth_error" => {
                let mut s = state.lock().unwrap();
                s.auth_error = true;
                break;
            }
            Err(_) => {
                // Network error — skip this repo, retry next cycle
            }
        }
    }

    {
        let mut s = state.lock().unwrap();
        s.first_poll = false;
    }

    rebuild(app, state);
}

fn rebuild(app: &tauri::AppHandle, state: &SharedState) {
    if let Some(tray) = app.tray_by_id("ghast-tray") {
        let _ = update_tray_badge(&tray, state);
    }
    let payload = {
        let s = state.lock().unwrap();
        s.panel_payload()
    };
    panel::emit_panel_update(app, &payload);
}
