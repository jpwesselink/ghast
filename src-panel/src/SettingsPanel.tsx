import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ThemeId } from "./panelCopy";
import { SETTINGS_COPY } from "./settingsCopy";
import "./theme-steve-settings.css";
import "./theme-hellripper-settings.css";

export type Section = "account" | "repositories" | "appearance" | "general";

interface GitHubRepo {
  full_name: string;
  private: boolean;
  description: string | null;
}

const SECTIONS: Section[] = ["account", "repositories", "appearance", "general"];


const NAV_TINTS: Record<Section, string> = {
  account: "#0a84ff",
  repositories: "#30d158",
  appearance: "#bf5af2",
  general: "#8e8e93",
};

const NAV_GLYPHS: Record<Section, string> = {
  account: "@",
  repositories: "⌥",
  appearance: "◐",
  general: "⚙",
};

export default function SettingsPanel({ themeId }: { themeId: ThemeId }) {
  const copy = SETTINGS_COPY[themeId];
  const [section, setSection] = useState<Section>("account");
  const [token, setToken] = useState("");
  const [bound, setBound] = useState(false);
  const [allRepos, setAllRepos] = useState<GitHubRepo[]>([]);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [reviewSet, setReviewSet] = useState<Set<string>>(new Set());
  const [mentionSet, setMentionSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [patStatus, setPatStatus] = useState("");
  const [patError, setPatError] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("normal");
  const [fontScale, setFontScale] = useState(1.0);
  const [expandRuns, setExpandRuns] = useState(5);
  const [runsPerRepo, setRunsPerRepo] = useState(5);
  const [repoTabs, setRepoTabs] = useState(true);

  useEffect(() => {
    invoke<{
      has_pat: boolean;
      watched_repos: string[];
      review_repos: string[];
      mention_repos: string[];
      theme: string;
      font_scale: number;
      focus_expand_runs: number;
      runs_per_repo: number;
      repo_tabs: boolean;
    }>("get_config").then((config) => {
      setCurrentTheme(config.theme);
      setFontScale(config.font_scale);
      setExpandRuns(config.focus_expand_runs);
      setRunsPerRepo(config.runs_per_repo);
      setRepoTabs(config.repo_tabs);
      if (config.has_pat) {
        setBound(true);
        setPatStatus(copy.connected);
        setWatchedSet(new Set(config.watched_repos));
        setReviewSet(new Set(config.review_repos));
        setMentionSet(new Set(config.mention_repos));
        loadRepos();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const repos = await invoke<GitHubRepo[]>("get_repos");
      setAllRepos(repos);
    } catch (e) {
      setPatStatus(copy.failed(e));
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
    setPatStatus(`${copy.connecting}...`);
    setPatError(false);
    try {
      const login = await invoke<string>("save_pat", { pat });
      setBound(true);
      setPatStatus(copy.connectedAs(login));
      setFlicker(true);
      setTimeout(() => setFlicker(false), 600);
      await loadRepos();
    } catch (e) {
      setPatStatus(`${e}`);
      setPatError(true);
    } finally {
      setConnecting(false);
    }
  };

  const saveUiPrefs = async (
    scale: number,
    runs: number,
    perRepo: number,
    tabs: boolean
  ) => {
    try {
      await invoke("set_ui_prefs", {
        fontScale: scale,
        focusExpandRuns: runs,
        runsPerRepo: perRepo,
        repoTabs: tabs,
      });
    } catch (e) {
      console.error("set_ui_prefs failed", e);
    }
  };

  const pickFontScale = (v: number) => {
    setFontScale(v);
    saveUiPrefs(v, expandRuns, runsPerRepo, repoTabs);
  };

  const pickExpandRuns = (v: number) => {
    setExpandRuns(v);
    saveUiPrefs(fontScale, v, runsPerRepo, repoTabs);
  };

  const pickRunsPerRepo = (v: number) => {
    setRunsPerRepo(v);
    saveUiPrefs(fontScale, expandRuns, v, repoTabs);
  };

  const pickRepoTabs = (v: boolean) => {
    setRepoTabs(v);
    saveUiPrefs(fontScale, expandRuns, runsPerRepo, v);
  };

  const pickTheme = async (th: string) => {
    setCurrentTheme(th);
    try {
      await invoke("set_theme", { theme: th });
    } catch (e) {
      console.error("set_theme failed", e);
    }
  };

  const seg = (
    options: { label: string; value: number }[],
    current: number,
    pick: (v: number) => void
  ) => (
    <div className="s-seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={current === o.value ? "active" : ""}
          onClick={() => pick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const prefRow = (label: string, hint: string, control: React.ReactNode) => (
    <div className="s-row">
      <span className="s-row-label">
        {label}
        <span className="s-row-hint">{hint}</span>
      </span>
      {control}
    </div>
  );

  return (
    <div className={`s-shell${flicker ? " screen-flicker" : ""}`}>
      <div className="decor-noise" />
      <nav className="s-sidebar">
        <div className="s-side-title">Ghast</div>
        {SECTIONS.map((id) => (
          <button
            key={id}
            className={`s-nav-item${section === id ? " active" : ""}`}
            onClick={() => setSection(id)}
          >
            <span className="s-nav-glyph" style={{ background: NAV_TINTS[id] }}>
              {NAV_GLYPHS[id]}
            </span>
            {copy.nav[id]}
          </button>
        ))}
      </nav>

      <main className="s-pane">
        {section === "account" && (
          <>
            <div className="s-pane-title">{copy.titles.account}</div>
            <div className="s-group">
              <div className="s-row">
                <input
                  className="s-input"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={copy.tokenPlaceholder}
                  spellCheck={false}
                />
                <button
                  className="s-eye-toggle"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? "Conceal" : "Reveal"}
                >
                  {showToken ? "◉" : "◎"}
                </button>
                <button className="s-btn" onClick={handleConnect} disabled={connecting}>
                  {connecting && <span className="s-spinner" />}
                  {connecting ? copy.connecting : copy.connect}
                </button>
              </div>
              {patStatus && (
                <div className={patError ? "s-status error" : "s-status"}>{patStatus}</div>
              )}
            </div>
          </>
        )}

        {section === "repositories" && (
          <>
            <div className="s-pane-title">{copy.titles.repositories}</div>
            <div className="s-group">
              <div className="s-row">
                <input
                  className="s-input"
                  placeholder={copy.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={allRepos.length === 0}
                />
                {loadingRepos && <span className="s-spinner" />}
              </div>
            </div>
            <div className="s-group">
              {loadingRepos && allRepos.length === 0 ? (
                <div className="s-loading-row">
                  <span className="s-spinner" />
                  {copy.loadingRepos}
                </div>
              ) : allRepos.length === 0 ? (
                <div className="s-empty">
                  {bound ? copy.emptyNone : copy.emptyUnbound}
                </div>
              ) : (
                <>
                  <div className="s-col-headers">
                    <span className="s-col-spacer">{copy.colRepository}</span>
                    <span className="s-col-h">{copy.colWorkflows}</span>
                    <span className="s-col-h">{copy.colReviews}</span>
                    <span className="s-col-h">{copy.colMentions}</span>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="s-empty">{copy.noMatches}</div>
                  ) : (
                    filtered.map((repo) => (
                      <div key={repo.full_name} className="s-repo-item">
                        <span className="s-repo-name">{repo.full_name}</span>
                        {repo.private && (
                          <span className="s-badge">{copy.privateBadge}</span>
                        )}
                        {[toggleRepo, toggleReviewRepo, toggleMentionRepo].map(
                          (toggle, i) => {
                            const set = [watchedSet, reviewSet, mentionSet][i];
                            return (
                              <div
                                key={i}
                                className="s-repo-col"
                                onClick={() => toggle(repo.full_name)}
                              >
                                <div
                                  className={`s-checkbox ${
                                    set.has(repo.full_name) ? "checked" : ""
                                  }`}
                                />
                              </div>
                            );
                          }
                        )}
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
            <div className="s-pane-title">{copy.titles.appearance}</div>
            {(
              <div className="s-group">
                <div className="s-theme-cards">
                  <button
                    className={`s-theme-card${currentTheme === "normal" ? " active" : ""}`}
                    onClick={() => pickTheme("normal")}
                  >
                    <div className="s-theme-thumb holy"></div>
                    <div className="s-theme-name">Steve</div>
                  </button>
                  <button
                    className={`s-theme-card${
                      currentTheme === "blackmetal" ? " active" : ""
                    }`}
                    onClick={() => pickTheme("blackmetal")}
                  >
                    <div className="s-theme-thumb hell">⛧</div>
                    <div className="s-theme-name">Hellripper</div>
                  </button>
                  <button
                    className={`s-theme-card${
                      currentTheme === "phosphor" ? " active" : ""
                    }`}
                    onClick={() => pickTheme("phosphor")}
                  >
                    <div className="s-theme-thumb crt">▮</div>
                    <div className="s-theme-name">Phosphor</div>
                  </button>
                  <button
                    className={`s-theme-card${
                      currentTheme === "pathe" ? " active" : ""
                    }`}
                    onClick={() => pickTheme("pathe")}
                  >
                    <div className="s-theme-thumb popcorn">!</div>
                    <div className="s-theme-name">Pathé</div>
                  </button>
                </div>
              </div>
            )}
            <div className="s-group">
              {prefRow(
                copy.fontSizeLabel,
                copy.fontSizeHint,
                seg(copy.fontSizes, fontScale, pickFontScale)
              )}
            </div>
          </>
        )}

        {section === "general" && (
          <>
            <div className="s-pane-title">{copy.titles.general}</div>
            <div className="s-group">
              {prefRow(
                copy.perRepoLabel,
                copy.perRepoHint,
                seg(
                  [1, 2, 3, 5, 10].map((n) => ({ label: String(n), value: n })),
                  runsPerRepo,
                  pickRunsPerRepo
                )
              )}
              {prefRow(
                copy.expandLabel,
                copy.expandHint,
                seg(
                  [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n })),
                  expandRuns,
                  pickExpandRuns
                )
              )}
              {prefRow(
                copy.repoTabsLabel,
                copy.repoTabsHint,
                seg(
                  [
                    { label: copy.onLabel, value: 1 },
                    { label: copy.offLabel, value: 0 },
                  ],
                  repoTabs ? 1 : 0,
                  (v) => pickRepoTabs(v === 1)
                )
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
