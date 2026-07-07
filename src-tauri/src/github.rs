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
    pub name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub html_url: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ReviewRequest {
    pub repo: String,
    pub number: u64,
    pub title: String,
    pub author: String,
    pub html_url: String,
    pub created_at: DateTime<Utc>,
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
    ) -> Result<Vec<WorkflowRun>, String> {
        let page = self
            .octo
            .workflows(owner, repo)
            .list_all_runs()
            .per_page(5)
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

        let runs = page
            .items
            .into_iter()
            .map(|r| WorkflowRun {
                name: r.name,
                status: r.status.clone(),
                conclusion: r.conclusion.clone(),
                html_url: r.html_url.to_string(),
                created_at: r.created_at,
            })
            .collect();

        Ok(runs)
    }

    pub async fn get_review_requests(
        &self,
        repos: &[String],
    ) -> Result<Vec<ReviewRequest>, String> {
        if repos.is_empty() {
            return Ok(Vec::new());
        }

        let repo_filter: String = repos
            .iter()
            .map(|r| format!("repo:{r}"))
            .collect::<Vec<_>>()
            .join(" ");
        let query = format!("is:pr is:open review-requested:@me {repo_filter}");

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
            out.push(ReviewRequest {
                repo,
                number: item.number,
                title: item.title,
                author: item.user.login,
                html_url: item.html_url.to_string(),
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
            let html_url = n
                .subject
                .url
                .as_ref()
                .and_then(|u| subject_html_url(u.as_str()))
                .unwrap_or_else(|| format!("https://github.com/{repo}"));
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
}
