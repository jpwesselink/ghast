use crate::state::{Mention, PendingReview, RunConclusion, RunStatus, WorkflowRun};
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

/// Returns review requests in `new` that are not in `old` (by html_url).
pub fn detect_new_review_requests(
    old: &[PendingReview],
    new: &[PendingReview],
) -> Vec<PendingReview> {
    new.iter()
        .filter(|n| !old.iter().any(|o| o.html_url == n.html_url))
        .cloned()
        .collect()
}

pub fn send_review_notification(app: &AppHandle, review: &PendingReview) {
    let _ = app.emit("workflow-completed", CompletionEvent {
        title: format!("Review requested: {}", review.repo),
        body: format!("#{} by @{} — {}", review.number, review.author, review.title),
    });
}

/// Returns mentions in `new` that are not in `old`, or whose thread was
/// updated since (a fresh mention on an already-known thread).
pub fn detect_new_mentions(old: &[Mention], new: &[Mention]) -> Vec<Mention> {
    new.iter()
        .filter(|n| {
            !old.iter()
                .any(|o| o.html_url == n.html_url && o.updated_at >= n.updated_at)
        })
        .cloned()
        .collect()
}

pub fn send_mention_notification(app: &AppHandle, mention: &Mention) {
    let _ = app.emit("workflow-completed", CompletionEvent {
        title: format!("New mention in {}", mention.repo),
        body: mention.title.clone(),
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

    fn mention(url: &str, updated_secs: i64) -> Mention {
        Mention {
            repo: "o/r".to_string(),
            title: "Some issue".to_string(),
            subject_type: "Issue".to_string(),
            html_url: url.to_string(),
            updated_at: chrono::DateTime::from_timestamp(updated_secs, 0).unwrap(),
        }
    }

    #[test]
    fn test_detect_new_mentions_fresh_thread() {
        let old = vec![mention("https://github.com/o/r/issues/1", 100)];
        let new = vec![
            mention("https://github.com/o/r/issues/1", 100),
            mention("https://github.com/o/r/issues/2", 200),
        ];
        let result = detect_new_mentions(&old, &new);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].html_url, "https://github.com/o/r/issues/2");
    }

    #[test]
    fn test_detect_new_mentions_updated_thread() {
        let old = vec![mention("https://github.com/o/r/issues/1", 100)];
        let new = vec![mention("https://github.com/o/r/issues/1", 300)];
        let result = detect_new_mentions(&old, &new);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_detect_new_mentions_unchanged() {
        let old = vec![mention("https://github.com/o/r/issues/1", 100)];
        let new = vec![mention("https://github.com/o/r/issues/1", 100)];
        assert!(detect_new_mentions(&old, &new).is_empty());
    }
}
