use crate::github::GitHubClient;
use crate::notify;
use crate::panel;
use crate::state::{Mention, PendingReview, SharedState, WorkflowRun};
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
    let (pat, repos, review_repos, mention_repos, runs_per_repo) = {
        let s = state.lock().unwrap();
        (
            s.github_pat.clone(),
            s.config.watched_repos.clone(),
            s.config.review_repos.clone(),
            s.config.mention_repos.clone(),
            s.config.runs_per_repo.clamp(1, 10) as u8,
        )
    };

    if pat.is_empty() || (repos.is_empty() && review_repos.is_empty() && mention_repos.is_empty()) {
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

        match client.get_workflow_runs(owner, name, runs_per_repo).await {
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

    poll_review_requests(app, state, &client, &review_repos).await;
    poll_mentions(app, state, &client, &mention_repos).await;

    rebuild(app, state);
}

async fn poll_review_requests(
    app: &tauri::AppHandle,
    state: &SharedState,
    client: &GitHubClient,
    repos: &[String],
) {
    if repos.is_empty() {
        let mut s = state.lock().unwrap();
        s.pending_reviews.clear();
        s.first_review_poll = false;
        return;
    }

    let api_reviews = match client.get_review_requests(repos).await {
        Ok(r) => r,
        Err(e) if e == "auth_error" => {
            let mut s = state.lock().unwrap();
            s.auth_error = true;
            return;
        }
        Err(_) => return, // network error — keep last known list
    };

    let new_reviews: Vec<PendingReview> =
        api_reviews.iter().map(PendingReview::from_api).collect();

    let to_notify: Vec<PendingReview> = {
        let s = state.lock().unwrap();
        if s.first_review_poll {
            Vec::new()
        } else {
            notify::detect_new_review_requests(&s.pending_reviews, &new_reviews)
        }
    };
    for review in &to_notify {
        notify::send_review_notification(app, review);
    }

    let mut s = state.lock().unwrap();
    s.pending_reviews = new_reviews;
    s.first_review_poll = false;
}

async fn poll_mentions(
    app: &tauri::AppHandle,
    state: &SharedState,
    client: &GitHubClient,
    repos: &[String],
) {
    if repos.is_empty() {
        let mut s = state.lock().unwrap();
        s.mentions.clear();
        s.first_mention_poll = false;
        return;
    }

    let api_mentions = match client.get_mentions(repos).await {
        Ok(m) => m,
        Err(e) if e == "auth_error" => {
            let mut s = state.lock().unwrap();
            s.auth_error = true;
            return;
        }
        Err(_) => return, // network error — keep last known list
    };

    let new_mentions: Vec<Mention> = api_mentions.iter().map(Mention::from_api).collect();

    let to_notify: Vec<Mention> = {
        let s = state.lock().unwrap();
        if s.first_mention_poll {
            Vec::new()
        } else {
            notify::detect_new_mentions(&s.mentions, &new_mentions)
        }
    };
    for mention in &to_notify {
        notify::send_mention_notification(app, mention);
    }

    let mut s = state.lock().unwrap();
    s.mentions = new_mentions;
    s.first_mention_poll = false;
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
