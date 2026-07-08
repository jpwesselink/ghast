use chrono::{DateTime, Utc};
use octocrab::Octocrab;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRepo {
    pub full_name: String,
    pub private: bool,
    pub description: Option<String>,
}

#[derive(Debug, Clone)]
pub struct WorkflowRun {
    pub id: u64,
    pub name: String,
    pub branch: String,
    pub on_default_branch: bool,
    pub pr_number: Option<u64>,
    pub status: String,
    pub conclusion: Option<String>,
    pub html_url: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RunStep {
    pub name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub number: i64,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RunJob {
    pub name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub html_url: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub steps: Vec<RunStep>,
}

fn enum_str<T: serde::Serialize>(v: &T) -> String {
    serde_json::to_value(v)
        .ok()
        .and_then(|x| x.as_str().map(String::from))
        .unwrap_or_default()
}

#[derive(Debug, Clone)]
pub struct ReviewRequest {
    pub repo: String,
    pub number: u64,
    pub title: String,
    pub author: String,
    pub html_url: String,
    pub created_at: DateTime<Utc>,
    pub draft: bool,
}

#[derive(Debug, Clone)]
pub struct Mention {
    pub repo: String,
    pub title: String,
    pub subject_type: String,
    pub html_url: String,
    pub updated_at: DateTime<Utc>,
}

/// Rewrites a notification subject API URL to its browser URL, e.g.
/// `https://api.github.com/repos/o/r/pulls/7` -> `https://github.com/o/r/pull/7`.
pub fn subject_html_url(api_url: &str) -> Option<String> {
    let rest = api_url.strip_prefix("https://api.github.com/repos/")?;
    let mut segs = rest.splitn(4, '/');
    let owner = segs.next()?;
    let repo = segs.next()?;
    let kind = match segs.next()? {
        "issues" => "issues",
        "pulls" => "pull",
        "commits" => "commit",
        _ => return None,
    };
    let id = segs.next()?;
    if owner.is_empty() || repo.is_empty() || id.is_empty() {
        return None;
    }
    Some(format!("https://github.com/{owner}/{repo}/{kind}/{id}"))
}

/// Anchor fragment for a notification's latest comment API URL, e.g.
/// `.../issues/comments/42` -> `#issuecomment-42`,
/// `.../pulls/comments/42` -> `#discussion_r42` (PR review comment),
/// `.../comments/42` -> `#commitcomment-42`.
fn comment_anchor(comment_api_url: &str) -> Option<String> {
    let rest = comment_api_url.strip_prefix("https://api.github.com/repos/")?;
    let mut segs = rest.split('/');
    let _owner = segs.next()?;
    let _repo = segs.next()?;
    match (segs.next()?, segs.next()?) {
        ("issues", "comments") => Some(format!("#issuecomment-{}", segs.next()?)),
        ("pulls", "comments") => Some(format!("#discussion_r{}", segs.next()?)),
        ("comments", id) => Some(format!("#commitcomment-{id}")),
        _ => None,
    }
}

/// Browser URL for a mention: the subject page, deep-linked to the latest
/// comment when the notification points at one.
pub fn mention_html_url(
    subject_url: Option<&str>,
    latest_comment_url: Option<&str>,
    repo: &str,
) -> String {
    let base = subject_url.and_then(subject_html_url);
    let anchored = match (&base, latest_comment_url) {
        (Some(base), Some(comment)) if Some(comment) != subject_url => {
            comment_anchor(comment).map(|a| format!("{base}{a}"))
        }
        _ => None,
    };
    anchored
        .or(base)
        .unwrap_or_else(|| format!("https://github.com/{repo}"))
}

pub struct GitHubClient {
    octo: Octocrab,
}

impl GitHubClient {
    pub fn new(pat: &str) -> Result<Self, String> {
        let octo = Octocrab::builder()
            .personal_token(pat.to_string())
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self { octo })
    }

    pub async fn validate_pat(&self) -> Result<String, String> {
        let user = self
            .octo
            .current()
            .user()
            .await
            .map_err(|e| {
                if e.to_string().contains("401") {
                    "Invalid token".to_string()
                } else {
                    e.to_string()
                }
            })?;
        Ok(user.login)
    }

    pub async fn get_workflow_runs(
        &self,
        owner: &str,
        repo: &str,
        per_page: u8,
    ) -> Result<Vec<WorkflowRun>, String> {
        // Raw JSON instead of octocrab's typed model: the typed Run drops
        // `pull_requests`, which links a run to its PR.
        let body: serde_json::Value = self
            .octo
            .get(
                format!("/repos/{owner}/{repo}/actions/runs?per_page={per_page}"),
                None::<&()>,
            )
            .await
            .map_err(|e| {
                let msg = e.to_string();
                if msg.contains("401") {
                    "auth_error".to_string()
                } else {
                    msg
                }
            })?;

        let runs = body["workflow_runs"]
            .as_array()
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|r| {
                let created_at = r["created_at"]
                    .as_str()
                    .and_then(|t| DateTime::parse_from_rfc3339(t).ok())?
                    .with_timezone(&Utc);
                let updated_at = r["updated_at"]
                    .as_str()
                    .and_then(|t| DateTime::parse_from_rfc3339(t).ok())
                    .map(|t| t.with_timezone(&Utc))
                    .unwrap_or(created_at);
                let branch = r["head_branch"].as_str().unwrap_or_default().to_string();
                Some(WorkflowRun {
                    id: r["id"].as_u64()?,
                    on_default_branch: r["repository"]["default_branch"].as_str()
                        == Some(branch.as_str()),
                    pr_number: r["pull_requests"][0]["number"].as_u64(),
                    branch,
                    name: r["name"].as_str().unwrap_or("workflow").to_string(),
                    status: r["status"].as_str().unwrap_or_default().to_string(),
                    conclusion: r["conclusion"].as_str().map(String::from),
                    html_url: r["html_url"].as_str().unwrap_or_default().to_string(),
                    created_at,
                    updated_at,
                })
            })
            .collect();

        Ok(runs)
    }

    pub async fn get_review_requests(
        &self,
        repos: &[String],
    ) -> Result<Vec<ReviewRequest>, String> {
        self.search_open_prs(repos, "review-requested:@me").await
    }

    pub async fn get_my_prs(&self, repos: &[String]) -> Result<Vec<ReviewRequest>, String> {
        self.search_open_prs(repos, "author:@me").await
    }

    async fn search_open_prs(
        &self,
        repos: &[String],
        who: &str,
    ) -> Result<Vec<ReviewRequest>, String> {
        if repos.is_empty() {
            return Ok(Vec::new());
        }

        let repo_filter: String = repos
            .iter()
            .map(|r| format!("repo:{r}"))
            .collect::<Vec<_>>()
            .join(" ");
        let query = format!("is:pr is:open {who} {repo_filter}");

        let page = self
            .octo
            .search()
            .issues_and_pull_requests(&query)
            .per_page(50)
            .send()
            .await
            .map_err(|e| {
                let msg = e.to_string();
                if msg.contains("401") {
                    "auth_error".to_string()
                } else {
                    msg
                }
            })?;

        // The search results don't carry a draft flag, so ask which of these
        // are drafts in a second, narrower search.
        let draft_urls: std::collections::HashSet<String> = self
            .octo
            .search()
            .issues_and_pull_requests(&format!("{query} draft:true"))
            .per_page(50)
            .send()
            .await
            .map(|p| p.items.into_iter().map(|i| i.html_url.to_string()).collect())
            .unwrap_or_default();

        let mut out = Vec::new();
        for item in page.items {
            let repo = item
                .repository_url
                .path_segments()
                .and_then(|mut segs| {
                    let owner = segs.next()?.to_string();
                    let name = segs.next()?.to_string();
                    Some(format!("{owner}/{name}"))
                })
                .unwrap_or_default();
            let html_url = item.html_url.to_string();
            out.push(ReviewRequest {
                repo,
                number: item.number,
                title: item.title,
                author: item.user.login,
                draft: draft_urls.contains(&html_url),
                html_url,
                created_at: item.created_at,
            });
        }
        Ok(out)
    }

    pub async fn get_mentions(&self, repos: &[String]) -> Result<Vec<Mention>, String> {
        if repos.is_empty() {
            return Ok(Vec::new());
        }

        // Unread notification threads only; threads are never marked read here.
        let page = self
            .octo
            .activity()
            .notifications()
            .list()
            .per_page(50)
            .send()
            .await
            .map_err(|e| {
                let msg = e.to_string();
                if msg.contains("401") {
                    "auth_error".to_string()
                } else {
                    msg
                }
            })?;

        let mut out = Vec::new();
        for n in page.items {
            if n.reason != "mention" {
                continue;
            }
            let repo = n.repository.full_name.clone().unwrap_or_default();
            if !repos.contains(&repo) {
                continue;
            }
            let subject_url = n.subject.url.as_ref().map(|u| u.to_string());
            let latest_comment_url = n.subject.latest_comment_url.as_ref().map(|u| u.to_string());
            let html_url = mention_html_url(
                subject_url.as_deref(),
                latest_comment_url.as_deref(),
                &repo,
            );
            out.push(Mention {
                repo,
                title: n.subject.title,
                subject_type: n.subject.r#type,
                html_url,
                updated_at: n.updated_at,
            });
        }
        Ok(out)
    }

    pub async fn get_run_jobs(
        &self,
        owner: &str,
        repo: &str,
        run_id: u64,
    ) -> Result<Vec<RunJob>, String> {
        let page = self
            .octo
            .workflows(owner, repo)
            .list_jobs(octocrab::models::RunId(run_id))
            .per_page(50)
            .send()
            .await
            .map_err(|e| {
                let msg = e.to_string();
                if msg.contains("401") {
                    "auth_error".to_string()
                } else {
                    msg
                }
            })?;

        Ok(page
            .items
            .into_iter()
            .map(|j| RunJob {
                name: j.name,
                status: enum_str(&j.status),
                conclusion: j.conclusion.as_ref().map(enum_str),
                html_url: j.html_url.to_string(),
                started_at: Some(j.started_at.to_rfc3339()),
                completed_at: j.completed_at.map(|t| t.to_rfc3339()),
                steps: j
                    .steps
                    .into_iter()
                    .map(|s| RunStep {
                        name: s.name,
                        status: enum_str(&s.status),
                        conclusion: s.conclusion.as_ref().map(enum_str),
                        number: s.number,
                        started_at: s.started_at.map(|t| t.to_rfc3339()),
                        completed_at: s.completed_at.map(|t| t.to_rfc3339()),
                    })
                    .collect(),
            })
            .collect())
    }

    pub async fn get_user_repos(&self) -> Result<Vec<GitHubRepo>, String> {
        let mut all_repos = Vec::new();
        let mut page = 1u8;

        loop {
            let repos = self
                .octo
                .current()
                .list_repos_for_authenticated_user()
                .visibility("all")
                .sort("pushed")
                .per_page(100)
                .page(page)
                .send()
                .await
                .map_err(|e| {
                    let msg = e.to_string();
                    if msg.contains("Connect") {
                        "Network error - check your connection".to_string()
                    } else if msg.contains("401") {
                        "Invalid token".to_string()
                    } else {
                        "Failed to fetch repositories".to_string()
                    }
                })?;

            let count = repos.items.len();

            for r in repos.items {
                all_repos.push(GitHubRepo {
                    full_name: r.full_name.unwrap_or_else(|| r.name),
                    private: r.private.unwrap_or(false),
                    description: r.description,
                });
            }

            if count < 100 {
                break;
            }
            page += 1;
        }

        Ok(all_repos)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subject_html_url_issue() {
        assert_eq!(
            subject_html_url("https://api.github.com/repos/o/r/issues/12"),
            Some("https://github.com/o/r/issues/12".to_string())
        );
    }

    #[test]
    fn test_subject_html_url_pull() {
        assert_eq!(
            subject_html_url("https://api.github.com/repos/o/r/pulls/7"),
            Some("https://github.com/o/r/pull/7".to_string())
        );
    }

    #[test]
    fn test_subject_html_url_commit() {
        assert_eq!(
            subject_html_url("https://api.github.com/repos/o/r/commits/abc123"),
            Some("https://github.com/o/r/commit/abc123".to_string())
        );
    }

    #[test]
    fn test_subject_html_url_unknown_kind() {
        assert_eq!(
            subject_html_url("https://api.github.com/repos/o/r/releases/5"),
            None
        );
    }

    #[test]
    fn test_subject_html_url_not_api() {
        assert_eq!(subject_html_url("https://github.com/o/r/issues/12"), None);
    }

    #[test]
    fn test_mention_url_issue_comment_anchor() {
        assert_eq!(
            mention_html_url(
                Some("https://api.github.com/repos/o/r/issues/12"),
                Some("https://api.github.com/repos/o/r/issues/comments/9001"),
                "o/r"
            ),
            "https://github.com/o/r/issues/12#issuecomment-9001"
        );
    }

    #[test]
    fn test_mention_url_pr_review_comment_anchor() {
        assert_eq!(
            mention_html_url(
                Some("https://api.github.com/repos/o/r/pulls/7"),
                Some("https://api.github.com/repos/o/r/pulls/comments/55"),
                "o/r"
            ),
            "https://github.com/o/r/pull/7#discussion_r55"
        );
    }

    #[test]
    fn test_mention_url_commit_comment_anchor() {
        assert_eq!(
            mention_html_url(
                Some("https://api.github.com/repos/o/r/commits/abc123"),
                Some("https://api.github.com/repos/o/r/comments/77"),
                "o/r"
            ),
            "https://github.com/o/r/commit/abc123#commitcomment-77"
        );
    }

    #[test]
    fn test_mention_url_no_comment_falls_back_to_subject() {
        assert_eq!(
            mention_html_url(
                Some("https://api.github.com/repos/o/r/issues/12"),
                None,
                "o/r"
            ),
            "https://github.com/o/r/issues/12"
        );
    }

    #[test]
    fn test_mention_url_comment_same_as_subject_no_anchor() {
        assert_eq!(
            mention_html_url(
                Some("https://api.github.com/repos/o/r/issues/12"),
                Some("https://api.github.com/repos/o/r/issues/12"),
                "o/r"
            ),
            "https://github.com/o/r/issues/12"
        );
    }

    #[test]
    fn test_mention_url_no_subject_falls_back_to_repo() {
        assert_eq!(
            mention_html_url(None, None, "o/r"),
            "https://github.com/o/r"
        );
    }
}
