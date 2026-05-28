import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GitHubRepo {
  full_name: string;
  private: boolean;
  description: string | null;
}

export default function Settings() {
  const [token, setToken] = useState("");
  const [bound, setBound] = useState(false);
  const [allRepos, setAllRepos] = useState<GitHubRepo[]>([]);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [patStatus, setPatStatus] = useState("");
  const [patError, setPatError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    invoke<{ has_pat: boolean; watched_repos: string[] }>("get_config").then((config) => {
      if (config.has_pat) {
        setBound(true);
        setPatStatus("Connected");
        setWatchedSet(new Set(config.watched_repos));
        loadRepos();
      }
    });
  }, []);

  async function loadRepos() {
    setLoading(true);
    try {
      const repos = await invoke<GitHubRepo[]>("get_repos");
      setAllRepos(repos);
    } catch (e) {
      setPatStatus(`Failed: ${e}`);
      setPatError(true);
    } finally {
      setLoading(false);
    }
  }

  const filtered = allRepos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRepo = async (name: string) => {
    const next = new Set(watchedSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setWatchedSet(next);
    try {
      await invoke("set_watched_repos", { repos: Array.from(next) });
    } catch (e) {
      console.error("set_watched_repos failed", e);
    }
  };

  const handleConnect = async () => {
    const pat = token.trim();
    if (!pat) return;
    setPatStatus("Connecting...");
    setPatError(false);
    try {
      const login = await invoke<string>("save_pat", { pat });
      setBound(true);
      setPatStatus(`Connected as ${login}`);
      await loadRepos();
    } catch (e) {
      setPatStatus(`${e}`);
      setPatError(true);
    }
  };

  return (
    <>
      <style>{`
        .s-container {
          font: menu;
          background: var(--s-bg);
          color: var(--s-text);
          min-height: 100vh;
          padding: 24px;
          --s-bg: #f5f5f5;
          --s-text: #1d1d1f;
          --s-secondary: #86868b;
          --s-border: #d2d2d7;
          --s-input-bg: #ffffff;
          --s-hover: #e8e8ed;
          --s-accent: #0064e0;
          --s-error: #ff3b30;
          --s-success: #34c759;
        }

        @media (prefers-color-scheme: dark) {
          .s-container {
            --s-bg: #1c1c1e;
            --s-text: #f5f5f7;
            --s-secondary: #86868b;
            --s-border: #38383a;
            --s-input-bg: #2c2c2e;
            --s-hover: #38383a;
            --s-accent: #0a84ff;
            --s-error: #ff453a;
            --s-success: #30d158;
          }
        }

        .s-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        .s-section {
          margin-bottom: 24px;
        }

        .s-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--s-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .s-row {
          display: flex;
          gap: 8px;
        }

        .s-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--s-border);
          border-radius: 6px;
          background: var(--s-input-bg);
          color: var(--s-text);
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .s-input:focus {
          border-color: var(--s-accent);
          box-shadow: 0 0 0 3px rgba(0, 100, 224, 0.15);
        }

        .s-input::placeholder { color: var(--s-secondary); }

        .s-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          background: var(--s-accent);
          color: #fff;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .s-btn:hover { opacity: 0.9; }
        .s-btn:active { opacity: 0.8; }
        .s-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .s-status {
          font-size: 12px;
          margin-top: 6px;
          color: var(--s-success);
        }

        .s-status.error { color: var(--s-error); }

        .s-search {
          width: 100%;
          margin-bottom: 8px;
        }

        .s-repo-list {
          border: 1px solid var(--s-border);
          border-radius: 8px;
          background: var(--s-input-bg);
          max-height: 400px;
          overflow-y: auto;
        }

        .s-repo-list::-webkit-scrollbar { width: 6px; }
        .s-repo-list::-webkit-scrollbar-thumb { background: var(--s-border); border-radius: 3px; }

        .s-repo-item {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-bottom: 1px solid var(--s-border);
          cursor: pointer;
          transition: background 0.1s;
          gap: 10px;
        }

        .s-repo-item:last-child { border-bottom: none; }
        .s-repo-item:hover { background: var(--s-hover); }

        .s-checkbox {
          width: 16px;
          height: 16px;
          border: 2px solid var(--s-border);
          border-radius: 4px;
          background: var(--s-input-bg);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .s-checkbox.checked {
          background: var(--s-accent);
          border-color: var(--s-accent);
        }

        .s-checkbox.checked::after {
          content: '\u2713';
          color: #fff;
          font-size: 11px;
          font-weight: 700;
        }

        .s-repo-name {
          flex: 1;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .s-badge {
          font-size: 10px;
          color: var(--s-secondary);
          border: 1px solid var(--s-border);
          border-radius: 4px;
          padding: 1px 6px;
        }

        .s-empty {
          padding: 24px;
          text-align: center;
          color: var(--s-secondary);
          font-size: 13px;
        }

        .s-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }

        .s-footer-status {
          flex: 1;
          font-size: 12px;
          color: var(--s-success);
        }
      `}</style>

      <div className="s-container">
        <div className="s-title">ghast Settings</div>

        <div className="s-section">
          <div className="s-label">GitHub Token</div>
          <div className="s-row">
            <input
              className="s-input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
              spellCheck={false}
            />
            <button className="s-btn" onClick={handleConnect}>
              Connect
            </button>
          </div>
          {patStatus && (
            <div className={`s-status ${patError ? "error" : ""}`}>{patStatus}</div>
          )}
        </div>

        <div className="s-section">
          <div className="s-label">Repositories</div>
          <input
            className="s-input s-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={allRepos.length === 0}
          />
          <div className="s-repo-list">
            {loading ? (
              <div className="s-empty">Loading...</div>
            ) : allRepos.length === 0 ? (
              <div className="s-empty">
                {bound ? "Loading repositories..." : "Connect your GitHub token to see repositories"}
              </div>
            ) : filtered.length === 0 ? (
              <div className="s-empty">No matches</div>
            ) : (
              filtered.map((repo) => (
                <div
                  key={repo.full_name}
                  className="s-repo-item"
                  onClick={() => toggleRepo(repo.full_name)}
                >
                  <div className={`s-checkbox ${watchedSet.has(repo.full_name) ? "checked" : ""}`} />
                  <span className="s-repo-name">{repo.full_name}</span>
                  {repo.private && <span className="s-badge">private</span>}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}
