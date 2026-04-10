use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Config {
    #[serde(default)]
    pub github_pat: String,
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
            github_pat: String::new(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.github_pat, "");
        assert!(config.watched_repos.is_empty());
        assert_eq!(config.poll_interval_secs, 30);
    }

    #[test]
    fn test_serialize_deserialize() {
        let config = Config {
            github_pat: "ghp_test123".to_string(),
            watched_repos: vec!["owner/repo".to_string()],
            poll_interval_secs: 30,
        };
        let json = serde_json::to_string(&config).unwrap();
        let loaded: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(config, loaded);
    }

    #[test]
    fn test_deserialize_with_missing_fields() {
        let json = r#"{"github_pat": "token"}"#;
        let config: Config = serde_json::from_str(json).unwrap();
        assert_eq!(config.github_pat, "token");
        assert!(config.watched_repos.is_empty());
        assert_eq!(config.poll_interval_secs, 30);
    }

    #[test]
    fn test_save_and_load() {
        let dir = std::env::temp_dir().join("ghast_test_config");
        let _ = fs::remove_dir_all(&dir);

        let config = Config {
            github_pat: "ghp_test".to_string(),
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
}
