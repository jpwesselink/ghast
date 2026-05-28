use crate::state::{RunConclusion, RunStatus, WorkflowRun};
use tauri::{AppHandle, Emitter};

/// Returns workflow runs that transitioned from active (Queued/InProgress) to Completed.
/// Returns empty if `old` is None (first poll for this repo — no baseline to diff against).
pub fn detect_completions(
    old: Option<&[WorkflowRun]>,
    new: &[WorkflowRun],
) -> Vec<WorkflowRun> {
    let old = match old {
        Some(runs) => runs,
        None => return vec![],
    };

    new.iter()
        .filter(|new_run| {
            new_run.status == RunStatus::Completed
                && old.iter().any(|old_run| {
                    old_run.html_url == new_run.html_url && old_run.is_active()
                })
        })
        .cloned()
        .collect()
}

#[derive(serde::Serialize, Clone)]
pub struct CompletionEvent {
    pub title: String,
    pub body: String,
}

pub fn send_completion_notification(app: &AppHandle, run: &WorkflowRun) {
    let conclusion_label = match &run.conclusion {
        Some(RunConclusion::Success)        => "succeeded",
        Some(RunConclusion::Failure)        => "failed",
        Some(RunConclusion::Cancelled)      => "cancelled",
        Some(RunConclusion::TimedOut)       => "timed out",
        Some(RunConclusion::ActionRequired) => "action required",
        Some(RunConclusion::Skipped)        => "skipped",
        Some(RunConclusion::Neutral)        => "neutral",
        None                                => "completed",
    };

    let _ = app.emit("workflow-completed", CompletionEvent {
        title: run.repo.clone(),
        body: format!("{} — {}", run.workflow_name, conclusion_label),
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::github::WorkflowRun as ApiWorkflowRun;
    use chrono::Utc;

    fn api_run(id: u64, status: &str, conclusion: Option<&str>) -> ApiWorkflowRun {
        ApiWorkflowRun {
            name: "CI".to_string(),
            status: status.to_string(),
            conclusion: conclusion.map(String::from),
            html_url: format!("https://github.com/o/r/actions/runs/{}", id),
            created_at: Utc::now(),
        }
    }

    fn run(id: u64, status: &str, conclusion: Option<&str>) -> WorkflowRun {
        WorkflowRun::from_api("owner/repo", &api_run(id, status, conclusion))
    }

    #[test]
    fn test_no_old_runs_returns_empty() {
        let new = vec![run(1, "completed", Some("success"))];
        let result = detect_completions(None, &new);
        assert!(result.is_empty());
    }

    #[test]
    fn test_no_transition_returns_empty() {
        let old = vec![run(1, "completed", Some("success"))];
        let new = vec![run(1, "completed", Some("success"))];
        let result = detect_completions(Some(&old), &new);
        assert!(result.is_empty());
    }

    #[test]
    fn test_in_progress_to_success() {
        let old = vec![run(1, "in_progress", None)];
        let new = vec![run(1, "completed", Some("success"))];
        let result = detect_completions(Some(&old), &new);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_in_progress_to_failure() {
        let old = vec![run(1, "in_progress", None)];
        let new = vec![run(1, "completed", Some("failure"))];
        let result = detect_completions(Some(&old), &new);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_queued_to_completed() {
        let old = vec![run(1, "queued", None)];
        let new = vec![run(1, "completed", Some("success"))];
        let result = detect_completions(Some(&old), &new);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_mixed_transitions() {
        let old = vec![
            run(1, "in_progress", None),
            run(2, "in_progress", None),
            run(3, "completed", Some("success")),
        ];
        let new = vec![
            run(1, "completed", Some("success")),
            run(2, "in_progress", None),
            run(3, "completed", Some("success")),
        ];
        let result = detect_completions(Some(&old), &new);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_empty_old_runs_returns_empty() {
        let old: Vec<WorkflowRun> = vec![];
        let new = vec![run(1, "completed", Some("success"))];
        let result = detect_completions(Some(&old), &new);
        assert!(result.is_empty());
    }
}
