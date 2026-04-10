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
    pub status: String,
    pub conclusion: Option<String>,
    pub html_url: String,
    pub created_at: DateTime<Utc>,
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
                id: r.id.0,
                name: r.name,
                status: r.status.clone(),
                conclusion: r.conclusion.clone(),
                html_url: r.html_url.to_string(),
                created_at: r.created_at,
            })
            .collect();

        Ok(runs)
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
