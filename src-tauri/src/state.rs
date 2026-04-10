use crate::config::Config;
use crate::github::WorkflowRun as ApiWorkflowRun;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq)]
pub enum RunStatus {
    Queued,
    InProgress,
    Completed,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RunConclusion {
    Success,
    Failure,
    Cancelled,
    Skipped,
    TimedOut,
    ActionRequired,
    Neutral,
}

#[derive(Debug, Clone)]
pub struct WorkflowRun {
    pub repo: String,
    pub workflow_name: String,
    pub status: RunStatus,
    pub conclusion: Option<RunConclusion>,
    pub html_url: String,
    pub created_at: DateTime<Utc>,
}

impl WorkflowRun {
    pub fn from_api(repo: &str, api_run: &ApiWorkflowRun) -> Self {
        Self {
            repo: repo.to_string(),
            workflow_name: api_run.name.clone(),
            status: match api_run.status.as_str() {
                "in_progress" => RunStatus::InProgress,
                "completed" => RunStatus::Completed,
                _ => RunStatus::Queued,
            },
            conclusion: api_run.conclusion.as_deref().map(|c| match c {
                "success" => RunConclusion::Success,
                "failure" => RunConclusion::Failure,
                "cancelled" => RunConclusion::Cancelled,
                "skipped" => RunConclusion::Skipped,
                "timed_out" => RunConclusion::TimedOut,
                "action_required" => RunConclusion::ActionRequired,
                _ => RunConclusion::Neutral,
            }),
            html_url: api_run.html_url.clone(),
            created_at: api_run.created_at,
        }
    }

    pub fn status_icon(&self) -> &str {
        match self.status {
            RunStatus::Queued => "🟡",
            RunStatus::InProgress => "🔵",
            RunStatus::Completed => match &self.conclusion {
                Some(RunConclusion::Success) => "🟢",
                Some(RunConclusion::Failure) => "🔴",
                Some(RunConclusion::Cancelled) => "⚪",
                _ => "⚪",
            },
        }
    }

    pub fn is_active(&self) -> bool {
        matches!(self.status, RunStatus::Queued | RunStatus::InProgress)
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PanelWorkflowRun {
    pub repo: String,
    pub workflow_name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub html_url: String,
    pub created_at: String,
}

impl From<&WorkflowRun> for PanelWorkflowRun {
    fn from(run: &WorkflowRun) -> Self {
        Self {
            repo: run.repo.clone(),
            workflow_name: run.workflow_name.clone(),
            status: match run.status {
                RunStatus::Queued => "queued",
                RunStatus::InProgress => "in_progress",
                RunStatus::Completed => "completed",
            }
            .to_string(),
            conclusion: run.conclusion.as_ref().map(|c| match c {
                RunConclusion::Success => "success",
                RunConclusion::Failure => "failure",
                RunConclusion::Cancelled => "cancelled",
                RunConclusion::Skipped => "skipped",
                RunConclusion::TimedOut => "timed_out",
                RunConclusion::ActionRequired => "action_required",
                RunConclusion::Neutral => "neutral",
            }.to_string()),
            html_url: run.html_url.clone(),
            created_at: run.created_at.to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PanelPayload {
    pub repos: Vec<String>,
    pub runs: HashMap<String, Vec<PanelWorkflowRun>>,
    pub auth_error: bool,
    pub has_pat: bool,
    pub badge_count: usize,
}

pub struct AppState {
    pub config: Config,
    pub runs: HashMap<String, Vec<WorkflowRun>>,
    pub auth_error: bool,
    pub config_dir: PathBuf,
    pub first_poll: bool,
}

impl AppState {
    pub fn new(config_dir: PathBuf) -> Self {
        let config = Config::load(&config_dir);
        Self {
            config,
            runs: HashMap::new(),
            auth_error: false,
            config_dir,
            first_poll: true,
        }
    }

    pub fn panel_payload(&self) -> PanelPayload {
        let mut repos = self.config.watched_repos.clone();
        repos.sort_by(|a, b| {
            let latest_a = self.runs.get(a)
                .and_then(|runs| runs.first().map(|r| r.created_at));
            let latest_b = self.runs.get(b)
                .and_then(|runs| runs.first().map(|r| r.created_at));
            latest_b.cmp(&latest_a)
        });

        let runs: HashMap<String, Vec<PanelWorkflowRun>> = self
            .runs
            .iter()
            .map(|(repo, runs)| {
                (repo.clone(), runs.iter().map(PanelWorkflowRun::from).collect())
            })
            .collect();

        PanelPayload {
            repos,
            runs,
            auth_error: self.auth_error,
            has_pat: !self.config.github_pat.is_empty(),
            badge_count: self.badge_count(),
        }
    }

    pub fn badge_count(&self) -> usize {
        self.runs
            .values()
            .flat_map(|runs| runs.iter())
            .filter(|r| r.is_active())
            .count()
    }
}

pub type SharedState = Arc<Mutex<AppState>>;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::github::WorkflowRun as ApiWorkflowRun;
    use chrono::Utc;

    fn make_api_run(status: &str, conclusion: Option<&str>) -> ApiWorkflowRun {
        ApiWorkflowRun {
            id: 1,
            name: "CI".to_string(),
            status: status.to_string(),
            conclusion: conclusion.map(String::from),
            html_url: "https://github.com/o/r/actions/runs/1".to_string(),
            created_at: Utc::now(),
        }
    }

    #[test]
    fn test_from_api_completed_success() {
        let api = make_api_run("completed", Some("success"));
        let run = WorkflowRun::from_api("owner/repo", &api);
        assert_eq!(run.status, RunStatus::Completed);
        assert_eq!(run.conclusion, Some(RunConclusion::Success));
        assert_eq!(run.workflow_name, "CI");
        assert_eq!(run.status_icon(), "🟢");
        assert!(!run.is_active());
    }

    #[test]
    fn test_from_api_completed_failure() {
        let api = make_api_run("completed", Some("failure"));
        let run = WorkflowRun::from_api("owner/repo", &api);
        assert_eq!(run.status_icon(), "🔴");
        assert!(!run.is_active());
    }

    #[test]
    fn test_from_api_in_progress() {
        let api = make_api_run("in_progress", None);
        let run = WorkflowRun::from_api("owner/repo", &api);
        assert_eq!(run.status, RunStatus::InProgress);
        assert_eq!(run.status_icon(), "🔵");
        assert!(run.is_active());
    }

    #[test]
    fn test_from_api_queued() {
        let api = make_api_run("queued", None);
        let run = WorkflowRun::from_api("owner/repo", &api);
        assert_eq!(run.status, RunStatus::Queued);
        assert_eq!(run.status_icon(), "🟡");
        assert!(run.is_active());
    }

    #[test]
    fn test_from_api_cancelled() {
        let api = make_api_run("completed", Some("cancelled"));
        let run = WorkflowRun::from_api("owner/repo", &api);
        assert_eq!(run.status_icon(), "⚪");
        assert!(!run.is_active());
    }

    #[test]
    fn test_from_api_fallback_name() {
        let api = ApiWorkflowRun {
            id: 1,
            name: "Deploy".to_string(),
            status: "completed".to_string(),
            conclusion: Some("success".to_string()),
            html_url: "https://github.com/o/r/actions/runs/1".to_string(),
            created_at: Utc::now(),
        };
        let run = WorkflowRun::from_api("owner/repo", &api);
        assert_eq!(run.workflow_name, "Deploy");
    }

    #[test]
    fn test_first_poll_initial_state() {
        let dir = std::env::temp_dir().join("ghast_first_poll_test");
        let state = AppState::new(dir);
        assert!(state.first_poll);
    }

    #[test]
    fn test_panel_payload_serialization() {
        let api = make_api_run("completed", Some("success"));
        let run = WorkflowRun::from_api("owner/repo", &api);
        let payload = PanelWorkflowRun::from(&run);
        assert_eq!(payload.repo, "owner/repo");
        assert_eq!(payload.status, "completed");
        assert_eq!(payload.conclusion, Some("success".to_string()));

        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("owner/repo"));
    }

    #[test]
    fn test_panel_payload_in_progress() {
        let api = make_api_run("in_progress", None);
        let run = WorkflowRun::from_api("owner/repo", &api);
        let payload = PanelWorkflowRun::from(&run);
        assert_eq!(payload.status, "in_progress");
        assert_eq!(payload.conclusion, None);
    }

    #[test]
    fn test_badge_count() {
        let dir = std::env::temp_dir().join("ghast_badge_test");
        let mut state = AppState::new(dir);

        let running =
            WorkflowRun::from_api("a/b", &make_api_run("in_progress", None));
        let failed =
            WorkflowRun::from_api("a/b", &make_api_run("completed", Some("failure")));
        let passed =
            WorkflowRun::from_api("a/b", &make_api_run("completed", Some("success")));

        state
            .runs
            .insert("a/b".to_string(), vec![running, failed, passed]);

        assert_eq!(state.badge_count(), 1); // only in_progress counts
    }
}
