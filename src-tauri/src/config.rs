use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Config {
    #[serde(default)]
    pub watched_repos: Vec<String>,
    #[serde(default = "default_poll_interval")]
    pub poll_interval_secs: u64,
}

fn default_poll_interval() -> u64 {
    30
}

impl Default for Config {
    fn default() -> Self {
        Self {
            watched_repos: Vec::new(),
            poll_interval_secs: 30,
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
        assert_eq!(config.poll_interval_secs, 30);
    }

    #[test]
    fn test_serialize_deserialize() {
        let config = Config {
            watched_repos: vec!["owner/repo".to_string()],
            poll_interval_secs: 30,
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
        assert_eq!(config.poll_interval_secs, 30);
    }

    #[test]
    fn test_save_and_load() {
        let dir = std::env::temp_dir().join("ghast_test_config");
        let _ = fs::remove_dir_all(&dir);

        let config = Config {
            watched_repos: vec!["owner/repo".to_string()],
            poll_interval_secs: 60,
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
