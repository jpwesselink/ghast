import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Section, SettingsTheme } from "./settingsTheme";
import "./settingsClean.css";
import "./settingsBlackmetal.css";

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

export default function SettingsPanel({ theme: t }: { theme: SettingsTheme }) {
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
    }>("get_config").then((config) => {
      setCurrentTheme(config.theme === "blackmetal" ? "blackmetal" : "normal");
      setFontScale(config.font_scale);
      setExpandRuns(config.focus_expand_runs);
      setRunsPerRepo(config.runs_per_repo);
      if (config.has_pat) {
        setBound(true);
        setPatStatus(t.copy.connected);
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
      setPatStatus(t.copy.failed(e));
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
    setPatStatus(`${t.copy.connecting}...`);
    setPatError(false);
    try {
      const login = await invoke<string>("save_pat", { pat });
      setBound(true);
      setPatStatus(t.copy.connectedAs(login));
      if (t.variant === "blackmetal") {
        setFlicker(true);
        setTimeout(() => setFlicker(false), 600);
      }
      await loadRepos();
    } catch (e) {
      setPatStatus(`${e}`);
      setPatError(true);
    } finally {
      setConnecting(false);
    }
  };

  const saveUiPrefs = async (scale: number, runs: number, perRepo: number) => {
    try {
      await invoke("set_ui_prefs", {
        fontScale: scale,
        focusExpandRuns: runs,
        runsPerRepo: perRepo,
      });
    } catch (e) {
      console.error("set_ui_prefs failed", e);
    }
  };

  const pickFontScale = (v: number) => {
    setFontScale(v);
    saveUiPrefs(v, expandRuns, runsPerRepo);
  };

  const pickExpandRuns = (v: number) => {
    setExpandRuns(v);
    saveUiPrefs(fontScale, v, runsPerRepo);
  };

  const pickRunsPerRepo = (v: number) => {
    setRunsPerRepo(v);
    saveUiPrefs(fontScale, expandRuns, v);
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
    <div className={t.c.seg}>
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
    <div className={t.c.row}>
      <span className={t.c.rowLabel}>
        {label}
        <span className={t.c.rowHint}>{hint}</span>
      </span>
      {control}
    </div>
  );

  return (
    <t.Shell flicker={flicker}>
      <nav className={t.c.sidebar}>
        {t.SidebarHeader()}
        {SECTIONS.map((id) => (
          <button
            key={id}
            className={`${t.c.navItem}${section === id ? " active" : ""}`}
            onClick={() => setSection(id)}
          >
            {t.variant === "clean" && (
              <span className="s-nav-glyph" style={{ background: NAV_TINTS[id] }}>
                {NAV_GLYPHS[id]}
              </span>
            )}
            {t.copy.nav[id]}
          </button>
        ))}
      </nav>

      <main className={t.c.pane}>
        {section === "account" && (
          <>
            <div className={t.c.paneTitle}>{t.copy.titles.account}</div>
            <div className={t.c.group}>
              <div className={t.c.row}>
                <input
                  className={t.c.input}
                  type={t.tokenReveal && showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t.copy.tokenPlaceholder}
                  spellCheck={false}
                />
                {t.tokenReveal && (
                  <button
                    className={t.c.eyeToggle}
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? "Conceal" : "Reveal"}
                  >
                    {showToken ? "◉" : "◎"}
                  </button>
                )}
                <button className={t.c.btn} onClick={handleConnect} disabled={connecting}>
                  {connecting && t.Spinner()}
                  {connecting ? t.copy.connecting : t.copy.connect}
                </button>
              </div>
              {patStatus && (
                <div className={patError ? t.c.statusError : t.c.status}>{patStatus}</div>
              )}
            </div>
          </>
        )}

        {section === "repositories" && (
          <>
            <div className={t.c.paneTitle}>{t.copy.titles.repositories}</div>
            <div className={t.c.group}>
              <div className={t.c.row}>
                <input
                  className={t.c.input}
                  placeholder={t.copy.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={allRepos.length === 0}
                />
                {loadingRepos && t.Spinner()}
              </div>
            </div>
            <div className={t.c.group}>
              {loadingRepos && allRepos.length === 0 ? (
                <div className={t.c.loadingRow}>
                  {t.Spinner()}
                  {t.copy.loadingRepos}
                </div>
              ) : allRepos.length === 0 ? (
                <div className={t.c.empty}>
                  {bound ? t.copy.emptyNone : t.copy.emptyUnbound}
                </div>
              ) : (
                <>
                  <div className={t.c.colHeaders}>
                    <span className={t.c.colSpacer}>{t.copy.colRepository}</span>
                    <span className={t.c.colH}>{t.copy.colWorkflows}</span>
                    <span className={t.c.colH}>{t.copy.colReviews}</span>
                    <span className={t.c.colH}>{t.copy.colMentions}</span>
                  </div>
                  {filtered.length === 0 ? (
                    <div className={t.c.empty}>{t.copy.noMatches}</div>
                  ) : (
                    filtered.map((repo) => (
                      <div key={repo.full_name} className={t.c.repoItem}>
                        <span className={t.c.repoName}>{repo.full_name}</span>
                        {repo.private && (
                          <span className={t.c.badge}>{t.copy.privateBadge}</span>
                        )}
                        {[toggleRepo, toggleReviewRepo, toggleMentionRepo].map(
                          (toggle, i) => {
                            const set = [watchedSet, reviewSet, mentionSet][i];
                            return (
                              <div
                                key={i}
                                className={t.c.repoCol}
                                onClick={() => toggle(repo.full_name)}
                              >
                                <div
                                  className={`${t.c.checkbox} ${
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
            <div className={t.c.paneTitle}>{t.copy.titles.appearance}</div>
            {t.showThemeCards && (
              <div className={t.c.group}>
                <div className={t.c.themeCards}>
                  <button
                    className={`${t.c.themeCard}${currentTheme === "normal" ? " active" : ""}`}
                    onClick={() => pickTheme("normal")}
                  >
                    <div className={t.c.themeThumbHoly}>☼</div>
                    <div className={t.c.themeName}>Holy Diver</div>
                  </button>
                  <button
                    className={`${t.c.themeCard}${
                      currentTheme === "blackmetal" ? " active" : ""
                    }`}
                    onClick={() => pickTheme("blackmetal")}
                  >
                    <div className={t.c.themeThumbHell}>⛧</div>
                    <div className={t.c.themeName}>Hellripper</div>
                  </button>
                </div>
              </div>
            )}
            <div className={t.c.group}>
              {prefRow(
                t.copy.fontSizeLabel,
                t.copy.fontSizeHint,
                seg(t.copy.fontSizes, fontScale, pickFontScale)
              )}
            </div>
          </>
        )}

        {section === "general" && (
          <>
            <div className={t.c.paneTitle}>{t.copy.titles.general}</div>
            <div className={t.c.group}>
              {prefRow(
                t.copy.perRepoLabel,
                t.copy.perRepoHint,
                seg(
                  [1, 2, 3, 5, 10].map((n) => ({ label: String(n), value: n })),
                  runsPerRepo,
                  pickRunsPerRepo
                )
              )}
              {prefRow(
                t.copy.expandLabel,
                t.copy.expandHint,
                seg(
                  [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n })),
                  expandRuns,
                  pickExpandRuns
                )
              )}
            </div>
          </>
        )}
      </main>
    </t.Shell>
  );
}
