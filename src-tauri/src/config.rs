use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Config {
    #[serde(default)]
    pub watched_repos: Vec<String>,
    #[serde(default)]
    pub review_repos: Vec<String>,
    #[serde(default)]
    pub mention_repos: Vec<String>,
    #[serde(default = "default_poll_interval")]
    pub poll_interval_secs: u64,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_font_scale")]
    pub font_scale: f64,
    #[serde(default = "default_focus_expand_runs")]
    pub focus_expand_runs: u32,
    #[serde(default = "default_runs_per_repo")]
    pub runs_per_repo: u32,
    #[serde(default = "default_repo_tabs")]
    pub repo_tabs: bool,
    /// Panel size in logical px, set once the user resizes the panel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub panel_width: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub panel_height: Option<f64>,
}

fn default_poll_interval() -> u64 {
    30
}

fn default_theme() -> String {
    "normal".to_string()
}

fn default_font_scale() -> f64 {
    1.0
}

fn default_focus_expand_runs() -> u32 {
    5
}

fn default_runs_per_repo() -> u32 {
    5
}

fn default_repo_tabs() -> bool {
    true
}

impl Default for Config {
    fn default() -> Self {
        Self {
            watched_repos: Vec::new(),
            review_repos: Vec::new(),
            mention_repos: Vec::new(),
            poll_interval_secs: 30,
            theme: default_theme(),
            font_scale: 1.0,
            focus_expand_runs: 5,
            runs_per_repo: 5,
            repo_tabs: true,
            panel_width: None,
            panel_height: None,
        }
    }
}

impl Config {
    pub fn load(config_dir: &Path) -> Self {
        let path = config_dir.join("config.json");
        match fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }

    pub fn save(&self, config_dir: &Path) -> Result<(), String> {
        fs::create_dir_all(config_dir).map_err(|e| e.to_string())?;
        let path = config_dir.join("config.json");
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())
    }
}

pub fn take_legacy_pat(config_dir: &Path) -> Option<String> {
    let path = config_dir.join("config.json");
    let contents = fs::read_to_string(&path).ok()?;
    let mut value: serde_json::Value = serde_json::from_str(&contents).ok()?;
    let obj = value.as_object_mut()?;
    let pat = obj.remove("github_pat")?.as_str()?.to_string();
    if pat.is_empty() {
        return None;
    }
    let rewritten = serde_json::to_string_pretty(&value).ok()?;
    let _ = fs::write(&path, rewritten);
    Some(pat)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert!(config.watched_repos.is_empty());
        assert!(config.review_repos.is_empty());
        assert!(config.mention_repos.is_empty());
        assert_eq!(config.poll_interval_secs, 30);
    }

    #[test]
    fn test_serialize_deserialize() {
        let config = Config {
            watched_repos: vec!["owner/repo".to_string()],
            review_repos: vec!["owner/other".to_string()],
            mention_repos: vec!["owner/third".to_string()],
            poll_interval_secs: 30,
            theme: "blackmetal".to_string(),
            font_scale: 1.15,
            focus_expand_runs: 3,
            runs_per_repo: 10,
            repo_tabs: false,
            panel_width: Some(320.0),
            panel_height: Some(480.0),
        };
        let json = serde_json::to_string(&config).unwrap();
        let loaded: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(config, loaded);
    }

    #[test]
    fn test_deserialize_with_missing_fields() {
        let json = r#"{}"#;
        let config: Config = serde_json::from_str(json).unwrap();
        assert!(config.watched_repos.is_empty());
        assert!(config.review_repos.is_empty());
        assert!(config.mention_repos.is_empty());
        assert_eq!(config.poll_interval_secs, 30);
        assert_eq!(config.theme, "normal");
        assert_eq!(config.font_scale, 1.0);
        assert_eq!(config.focus_expand_runs, 5);
        assert_eq!(config.runs_per_repo, 5);
        assert!(config.repo_tabs);
    }

    #[test]
    fn test_save_and_load() {
        let dir = std::env::temp_dir().join("ghast_test_config");
        let _ = fs::remove_dir_all(&dir);

        let config = Config {
            watched_repos: vec!["owner/repo".to_string()],
            review_repos: vec!["owner/other".to_string()],
            mention_repos: vec!["owner/third".to_string()],
            poll_interval_secs: 60,
            theme: "normal".to_string(),
            font_scale: 1.0,
            focus_expand_runs: 5,
            runs_per_repo: 5,
            repo_tabs: true,
            panel_width: None,
            panel_height: None,
        };
        config.save(&dir).unwrap();

        let loaded = Config::load(&dir);
        assert_eq!(config, loaded);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_load_missing_file_returns_default() {
        let dir = std::env::temp_dir().join("ghast_test_nonexistent");
        let config = Config::load(&dir);
        assert_eq!(config, Config::default());
    }

    #[test]
    fn test_take_legacy_pat_extracts_and_strips() {
        let dir = std::env::temp_dir().join("ghast_legacy_pat_test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("config.json");
        fs::write(
            &path,
            r#"{"github_pat":"ghp_legacy","watched_repos":["a/b"],"poll_interval_secs":30}"#,
        )
        .unwrap();

        let pat = take_legacy_pat(&dir);
        assert_eq!(pat.as_deref(), Some("ghp_legacy"));

        let rewritten = fs::read_to_string(&path).unwrap();
        assert!(!rewritten.contains("github_pat"));
        let loaded = Config::load(&dir);
        assert_eq!(loaded.watched_repos, vec!["a/b".to_string()]);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_take_legacy_pat_no_field() {
        let dir = std::env::temp_dir().join("ghast_legacy_pat_none_test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join("config.json"),
            r#"{"watched_repos":["a/b"],"poll_interval_secs":30}"#,
        )
        .unwrap();

        assert!(take_legacy_pat(&dir).is_none());
        let _ = fs::remove_dir_all(&dir);
    }
}
