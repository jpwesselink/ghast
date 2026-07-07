import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GitHubRepo {
  full_name: string;
  private: boolean;
  description: string | null;
}

type Section = "account" | "repositories" | "appearance" | "general";

const FONT_SIZES: { label: string; value: number }[] = [
  { label: "Small", value: 0.9 },
  { label: "Default", value: 1.0 },
  { label: "Large", value: 1.15 },
  { label: "Huge", value: 1.3 },
];

const NAV: { id: Section; label: string; glyph: string; tint: string }[] = [
  { id: "account", label: "Account", glyph: "@", tint: "#0a84ff" },
  { id: "repositories", label: "Repositories", glyph: "⌥", tint: "#30d158" },
  { id: "appearance", label: "Appearance", glyph: "◐", tint: "#bf5af2" },
  { id: "general", label: "General", glyph: "⚙", tint: "#8e8e93" },
];

function Spinner() {
  return <span className="s-spinner" />;
}

export default function Settings() {
  const [section, setSection] = useState<Section>("account");
  const [token, setToken] = useState("");
  const [bound, setBound] = useState(false);
  const [allRepos, setAllRepos] = useState<GitHubRepo[]>([]);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [reviewSet, setReviewSet] = useState<Set<string>>(new Set());
  const [mentionSet, setMentionSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [patStatus, setPatStatus] = useState("");
  const [patError, setPatError] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [theme, setTheme] = useState("normal");
  const [fontScale, setFontScale] = useState(1.0);
  const [expandRuns, setExpandRuns] = useState(5);

  useEffect(() => {
    invoke<{
      has_pat: boolean;
      watched_repos: string[];
      review_repos: string[];
      mention_repos: string[];
      theme: string;
      font_scale: number;
      focus_expand_runs: number;
    }>("get_config").then((config) => {
      setTheme(config.theme === "blackmetal" ? "blackmetal" : "normal");
      setFontScale(config.font_scale);
      setExpandRuns(config.focus_expand_runs);
      if (config.has_pat) {
        setBound(true);
        setPatStatus("Connected");
        setWatchedSet(new Set(config.watched_repos));
        setReviewSet(new Set(config.review_repos));
        setMentionSet(new Set(config.mention_repos));
        loadRepos();
      }
    });
  }, []);

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const repos = await invoke<GitHubRepo[]>("get_repos");
      setAllRepos(repos);
    } catch (e) {
      setPatStatus(`Failed: ${e}`);
      setPatError(true);
    } finally {
      setLoadingRepos(false);
    }
  }

  const filtered = allRepos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleIn = (
    set: Set<string>,
    setSet: (s: Set<string>) => void,
    command: string
  ) => {
    return async (name: string) => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      setSet(next);
      try {
        await invoke(command, { repos: Array.from(next) });
      } catch (e) {
        console.error(`${command} failed`, e);
      }
    };
  };

  const toggleRepo = toggleIn(watchedSet, setWatchedSet, "set_watched_repos");
  const toggleReviewRepo = toggleIn(reviewSet, setReviewSet, "set_review_repos");
  const toggleMentionRepo = toggleIn(mentionSet, setMentionSet, "set_mention_repos");

  const handleConnect = async () => {
    const pat = token.trim();
    if (!pat) return;
    setConnecting(true);
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
    } finally {
      setConnecting(false);
    }
  };

  const saveUiPrefs = async (scale: number, runs: number) => {
    try {
      await invoke("set_ui_prefs", { fontScale: scale, focusExpandRuns: runs });
    } catch (e) {
      console.error("set_ui_prefs failed", e);
    }
  };

  const pickFontScale = (v: number) => {
    setFontScale(v);
    saveUiPrefs(v, expandRuns);
  };

  const pickExpandRuns = (v: number) => {
    setExpandRuns(v);
    saveUiPrefs(fontScale, v);
  };

  const pickTheme = async (t: string) => {
    setTheme(t);
    try {
      await invoke("set_theme", { theme: t });
    } catch (e) {
      console.error("set_theme failed", e);
    }
  };

  return (
    <>
      <style>{`
        .s-shell {
          font: menu;
          display: flex;
          height: 100vh;
          background: var(--s-bg);
          color: var(--s-text);
          --s-bg: #f2f2f7;
          --s-sidebar: #e9e9ee;
          --s-text: #1d1d1f;
          --s-secondary: #86868b;
          --s-border: #d8d8dd;
          --s-input-bg: #ffffff;
          --s-card: #ffffff;
          --s-hover: #e3e3e8;
          --s-accent: #0064e0;
          --s-accent: AccentColor;
          --s-error: #ff3b30;
          --s-success: #34c759;
        }

        @media (prefers-color-scheme: dark) {
          .s-shell {
            --s-bg: #1e1e20;
            --s-sidebar: #232326;
            --s-text: #f5f5f7;
            --s-secondary: #98989f;
            --s-border: #3a3a3e;
            --s-input-bg: #2c2c2e;
            --s-card: #29292c;
            --s-hover: #333336;
            --s-accent: #0a84ff;
            --s-accent: AccentColor;
            --s-error: #ff453a;
            --s-success: #30d158;
          }
        }

        .s-sidebar {
          width: 185px;
          flex-shrink: 0;
          background: var(--s-sidebar);
          border-right: 1px solid var(--s-border);
          padding: 14px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .s-nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 6px 9px;
          border: none;
          background: none;
          color: var(--s-text);
          font: inherit;
          font-size: 13px;
          border-radius: 7px;
          cursor: default;
          text-align: left;
        }

        .s-nav-item:hover { background: var(--s-hover); }
        .s-nav-item.active { background: var(--s-accent); color: #fff; }

        .s-nav-glyph {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 12px;
          flex-shrink: 0;
        }

        .s-pane {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 22px 26px;
        }

        .s-pane-title {
          font-size: 19px;
          font-weight: 700;
          margin-bottom: 18px;
          letter-spacing: -0.01em;
        }

        .s-group {
          background: var(--s-card);
          border: 1px solid var(--s-border);
          border-radius: 10px;
          margin-bottom: 18px;
          overflow: hidden;
        }

        .s-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
        }

        .s-row + .s-row { border-top: 1px solid var(--s-border); }

        .s-row-label { flex: 1; font-size: 13px; }
        .s-row-label .s-row-hint {
          display: block;
          font-size: 11.5px;
          color: var(--s-secondary);
          margin-top: 2px;
        }

        .s-seg {
          display: inline-flex;
          background: var(--s-hover);
          border-radius: 7px;
          padding: 2px;
          gap: 2px;
        }

        .s-seg button {
          border: none;
          background: transparent;
          color: var(--s-text);
          font: inherit;
          font-size: 12px;
          padding: 3px 12px;
          border-radius: 5px;
          cursor: default;
        }

        .s-seg button.active {
          background: var(--s-input-bg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
          font-weight: 600;
        }

        .s-input {
          flex: 1;
          padding: 7px 11px;
          border: 1px solid var(--s-border);
          border-radius: 7px;
          background: var(--s-input-bg);
          color: var(--s-text);
          font: inherit;
          font-size: 13px;
          outline: none;
          min-width: 0;
        }

        .s-input:focus {
          border-color: var(--s-accent);
          box-shadow: 0 0 0 3px rgba(0, 100, 224, 0.15);
        }

        .s-input::placeholder { color: var(--s-secondary); }

        .s-btn {
          padding: 7px 15px;
          border: none;
          border-radius: 7px;
          background: var(--s-accent);
          color: #fff;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: default;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .s-btn:hover { opacity: 0.9; }
        .s-btn:disabled { opacity: 0.5; }

        .s-status { font-size: 12px; padding: 0 14px 11px; color: var(--s-success); }
        .s-status.error { color: var(--s-error); }

        .s-spinner {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          border: 2px solid rgba(127, 127, 127, 0.3);
          border-top-color: var(--s-accent);
          animation: s-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .s-btn .s-spinner { border-top-color: #fff; }

        @keyframes s-spin { to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
          .s-spinner { animation-duration: 1.6s; }
        }

        .s-loading-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 28px;
          color: var(--s-secondary);
          font-size: 13px;
        }

        .s-repo-list { max-height: none; }

        .s-col-headers {
          display: flex;
          padding: 8px 14px;
          gap: 10px;
          color: var(--s-secondary);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--s-border);
        }
        .s-col-headers .s-col-spacer { flex: 1; }
        .s-col-headers .s-col-h { width: 60px; text-align: center; flex-shrink: 0; }

        .s-repo-item {
          display: flex;
          align-items: center;
          padding: 9px 14px;
          border-bottom: 1px solid var(--s-border);
          gap: 10px;
        }

        .s-repo-item:last-child { border-bottom: none; }
        .s-repo-item:hover { background: var(--s-hover); }

        .s-repo-col {
          width: 60px;
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          cursor: default;
        }

        .s-checkbox {
          width: 16px;
          height: 16px;
          border: 1.5px solid var(--s-border);
          border-radius: 4px;
          background: var(--s-input-bg);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .s-checkbox.checked {
          background: var(--s-accent);
          border-color: var(--s-accent);
        }

        .s-checkbox.checked::after {
          content: '✓';
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
          flex-shrink: 0;
        }

        .s-empty {
          padding: 24px;
          text-align: center;
          color: var(--s-secondary);
          font-size: 13px;
        }

        .s-theme-cards { display: flex; gap: 12px; padding: 14px; }

        .s-theme-card {
          flex: 1;
          border: 2px solid var(--s-border);
          border-radius: 10px;
          padding: 0;
          overflow: hidden;
          cursor: default;
          background: none;
          font: inherit;
          color: var(--s-text);
          text-align: center;
        }

        .s-theme-card.active { border-color: var(--s-accent); }

        .s-theme-thumb { height: 58px; display: flex; align-items: center; justify-content: center; font-size: 21px; }
        .s-theme-thumb.holy { background: linear-gradient(180deg, #f4f4f6, #dcdce2); color: #444; }
        .s-theme-thumb.hell { background: linear-gradient(180deg, #17090a, #050000); color: #c01818; }

        .s-theme-name { font-size: 12px; font-weight: 600; padding: 7px 0; }
      `}</style>

      <div className="s-shell">
        <nav className="s-sidebar">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`s-nav-item${section === item.id ? " active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              <span className="s-nav-glyph" style={{ background: item.tint }}>
                {item.glyph}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <main className="s-pane">
          {section === "account" && (
            <>
              <div className="s-pane-title">Account</div>
              <div className="s-group">
                <div className="s-row">
                  <input
                    className="s-input"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="GitHub token (ghp_...)"
                    spellCheck={false}
                  />
                  <button className="s-btn" onClick={handleConnect} disabled={connecting}>
                    {connecting && <Spinner />}
                    {connecting ? "Connecting" : "Connect"}
                  </button>
                </div>
                {patStatus && (
                  <div className={`s-status ${patError ? "error" : ""}`}>{patStatus}</div>
                )}
              </div>
            </>
          )}

          {section === "repositories" && (
            <>
              <div className="s-pane-title">Repositories</div>
              <div className="s-group">
                <div className="s-row">
                  <input
                    className="s-input"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={allRepos.length === 0}
                  />
                  {loadingRepos && <Spinner />}
                </div>
              </div>
              <div className="s-group s-repo-list">
                {loadingRepos && allRepos.length === 0 ? (
                  <div className="s-loading-row">
                    <Spinner />
                    Fetching repositories...
                  </div>
                ) : allRepos.length === 0 ? (
                  <div className="s-empty">
                    {bound
                      ? "No repositories found"
                      : "Connect your GitHub token under Account first"}
                  </div>
                ) : (
                  <>
                    <div className="s-col-headers">
                      <span className="s-col-spacer">Repository</span>
                      <span className="s-col-h">Workflows</span>
                      <span className="s-col-h">Reviews</span>
                      <span className="s-col-h">Mentions</span>
                    </div>
                    {filtered.length === 0 ? (
                      <div className="s-empty">No matches</div>
                    ) : (
                      filtered.map((repo) => (
                        <div key={repo.full_name} className="s-repo-item">
                          <span className="s-repo-name">{repo.full_name}</span>
                          {repo.private && <span className="s-badge">private</span>}
                          <div className="s-repo-col" onClick={() => toggleRepo(repo.full_name)}>
                            <div className={`s-checkbox ${watchedSet.has(repo.full_name) ? "checked" : ""}`} />
                          </div>
                          <div className="s-repo-col" onClick={() => toggleReviewRepo(repo.full_name)}>
                            <div className={`s-checkbox ${reviewSet.has(repo.full_name) ? "checked" : ""}`} />
                          </div>
                          <div className="s-repo-col" onClick={() => toggleMentionRepo(repo.full_name)}>
                            <div className={`s-checkbox ${mentionSet.has(repo.full_name) ? "checked" : ""}`} />
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {section === "appearance" && (
            <>
              <div className="s-pane-title">Appearance</div>
              <div className="s-group">
                <div className="s-theme-cards">
                  <button
                    className={`s-theme-card${theme === "normal" ? " active" : ""}`}
                    onClick={() => pickTheme("normal")}
                  >
                    <div className="s-theme-thumb holy">☼</div>
                    <div className="s-theme-name">Holy Diver</div>
                  </button>
                  <button
                    className={`s-theme-card${theme === "blackmetal" ? " active" : ""}`}
                    onClick={() => pickTheme("blackmetal")}
                  >
                    <div className="s-theme-thumb hell">⛧</div>
                    <div className="s-theme-name">Hellripper</div>
                  </button>
                </div>
              </div>
              <div className="s-group">
                <div className="s-row">
                  <span className="s-row-label">
                    Font size
                    <span className="s-row-hint">Scales text in the menubar panel</span>
                  </span>
                  <div className="s-seg">
                    {FONT_SIZES.map((f) => (
                      <button
                        key={f.value}
                        className={fontScale === f.value ? "active" : ""}
                        onClick={() => pickFontScale(f.value)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {section === "general" && (
            <>
              <div className="s-pane-title">General</div>
              <div className="s-group">
                <div className="s-row">
                  <span className="s-row-label">
                    Runs per quiet repo
                    <span className="s-row-hint">
                      How many runs show when expanding a repo under "All quiet" in Focus view
                    </span>
                  </span>
                  <div className="s-seg">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={expandRuns === n ? "active" : ""}
                        onClick={() => pickExpandRuns(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
