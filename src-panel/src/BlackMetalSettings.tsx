import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GitHubRepo {
  full_name: string;
  private: boolean;
  description: string | null;
}

type Section = "account" | "repositories" | "appearance" | "general";

const FONT_SIZES: { label: string; value: number }[] = [
  { label: "Meek", value: 0.9 },
  { label: "Mortal", value: 1.0 },
  { label: "Grand", value: 1.15 },
  { label: "Colossal", value: 1.3 },
];

const NAV: { id: Section; label: string }[] = [
  { id: "account", label: "Soul Binding" },
  { id: "repositories", label: "Haunted Repos" },
  { id: "appearance", label: "Vestments" },
  { id: "general", label: "Rites" },
];

function NoiseCanvas({ opacity = 0.08 }: { opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = 300;
    c.height = 300;
    const img = ctx.createImageData(300, 300);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        pointerEvents: "none",
        zIndex: 9999,
        mixBlendMode: "overlay",
      }}
    />
  );
}

function Pentagram({ size = 20, color = "#8b0000", className }: { size?: number; color?: string; className?: string }) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${50 + 45 * Math.cos(angle)},${50 + 45 * Math.sin(angle)}`);
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polygon points={pts.join(" ")} fill="none" stroke={color} strokeWidth="3" />
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function Sigil() {
  return <Pentagram size={15} color="#cc2020" className="bms-sigil-spin" />;
}

export default function BlackMetalSettings() {
  const [section, setSection] = useState<Section>("account");
  const [token, setToken] = useState("");
  const [bound, setBound] = useState(false);
  const [allRepos, setAllRepos] = useState<GitHubRepo[]>([]);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [reviewSet, setReviewSet] = useState<Set<string>>(new Set());
  const [mentionSet, setMentionSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [flickerClass, setFlickerClass] = useState("");
  const [patStatus, setPatStatus] = useState("");
  const [patError, setPatError] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [binding, setBinding] = useState(false);
  const [theme, setTheme] = useState("blackmetal");
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
        setPatStatus("Soul bound");
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
      setPatStatus(`The ritual failed: ${e}`);
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

  const handleBind = async () => {
    const pat = token.trim();
    if (!pat) return;
    setBinding(true);
    setPatStatus("Performing the ritual...");
    setPatError(false);
    try {
      const login = await invoke<string>("save_pat", { pat });
      setBound(true);
      setPatStatus(`Bound to ${login}`);
      setFlickerClass("screen-flicker");
      setTimeout(() => setFlickerClass(""), 600);
      await loadRepos();
    } catch (e) {
      setPatStatus(`Binding failed: ${e}`);
      setPatError(true);
    } finally {
      setBinding(false);
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
        @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&display=swap');

        @keyframes candleGlow {
          0%, 100% { text-shadow: 0 0 10px #b01010, 0 0 25px #8b0000, 0 0 50px #5a0000; }
          33% { text-shadow: 0 0 14px #cc2020, 0 0 30px #a00000, 0 0 60px #5a0000; }
          66% { text-shadow: 0 0 8px #901010, 0 0 20px #8b0000, 0 0 45px #4a0000; }
        }

        @keyframes screenFlicker {
          0% { filter: brightness(1) contrast(1); }
          5% { filter: brightness(3) contrast(0.5); }
          10% { filter: brightness(0.3) contrast(2); }
          15% { filter: brightness(1) contrast(1); }
          25% { filter: brightness(2) contrast(0.8); }
          30% { filter: brightness(1) contrast(1); }
        }

        @keyframes sigilSpin { to { transform: rotate(360deg); } }

        .bms-sigil-spin {
          animation: sigilSpin 1.4s linear infinite;
          flex-shrink: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .bms-sigil-spin { animation-duration: 3s; }
        }

        .screen-flicker { animation: screenFlicker 0.6s ease-out; }

        .bms-shell {
          font-family: 'IM Fell English', serif;
          display: flex;
          height: 100vh;
          background: #080808;
          color: #ddd6c8;
          position: relative;
        }

        .bms-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(160, 10, 10, 0.1) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(160, 10, 10, 0.05) 0%, transparent 40%);
          pointer-events: none;
        }

        .bms-sidebar {
          width: 185px;
          flex-shrink: 0;
          border-right: 1px solid #2a1a18;
          background: #0a0806;
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          position: relative;
          z-index: 1;
        }

        .bms-side-title {
          font-family: 'UnifrakturMaguntia', cursive;
          font-size: 30px;
          text-align: center;
          color: #ede6d8;
          letter-spacing: 3px;
          animation: candleGlow 4s ease-in-out infinite;
          margin-bottom: 14px;
          line-height: 1;
        }

        .bms-nav-item {
          display: block;
          width: 100%;
          border: none;
          background: none;
          color: #8a7e6e;
          font-family: 'IM Fell English SC', serif;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 8px 10px;
          cursor: pointer;
          text-align: left;
          border-left: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
        }

        .bms-nav-item:hover { color: #d0c4b0; }

        .bms-nav-item.active {
          color: #ede6d8;
          border-left-color: #b01010;
          text-shadow: 0 0 8px rgba(180, 20, 20, 0.4);
        }

        .bms-pane {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          padding: 22px 26px;
          position: relative;
          z-index: 1;
        }

        .bms-pane::-webkit-scrollbar { width: 6px; }
        .bms-pane::-webkit-scrollbar-track { background: #0a0806; }
        .bms-pane::-webkit-scrollbar-thumb { background: #3a2525; border-radius: 3px; }

        .bms-pane-title {
          font-family: 'IM Fell English SC', serif;
          font-size: 17px;
          letter-spacing: 5px;
          color: #c01818;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .bms-group {
          border: 1px solid #2a1a18;
          background: #0c0908;
          margin-bottom: 18px;
        }

        .bms-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
        }

        .bms-row + .bms-row { border-top: 1px solid #221816; }

        .bms-row-label { flex: 1; font-size: 14px; color: #b8b0a0; }
        .bms-row-label .bms-row-hint {
          display: block;
          font-size: 12px;
          font-style: italic;
          color: #6a5f50;
          margin-top: 2px;
        }

        .bms-input {
          flex: 1;
          box-sizing: border-box;
          background: #0c0a08;
          border: 1px solid #3a2525;
          color: #ddd6c8;
          font-family: 'IM Fell English', serif;
          font-size: 14px;
          padding: 8px 12px;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s;
          min-width: 0;
        }

        .bms-input:focus {
          border-color: #b01010;
          box-shadow: 0 0 15px rgba(160, 10, 10, 0.3);
        }

        .bms-input::placeholder { color: #584e44; font-style: italic; }

        .bms-btn {
          font-family: 'IM Fell English SC', serif;
          font-size: 12px;
          letter-spacing: 3px;
          text-transform: uppercase;
          background: #1a0808;
          color: #b01010;
          border: 1px solid #4a2020;
          padding: 8px 20px;
          cursor: pointer;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .bms-btn:hover {
          border-color: #b01010;
          color: #dd3030;
          box-shadow: 0 0 25px rgba(160, 10, 10, 0.4);
        }

        .bms-btn:disabled { opacity: 0.6; }

        .bms-status {
          font-size: 12px;
          font-style: italic;
          color: #78b830;
          padding: 0 14px 12px;
          letter-spacing: 1px;
        }

        .bms-status.error { color: #cc3333; }

        .bms-loading-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 30px;
          color: #8a7e6e;
          font-style: italic;
          font-size: 13px;
        }

        .bms-seg { display: inline-flex; gap: 4px; }

        .bms-seg button {
          border: 1px solid #3a2525;
          background: #0a0604;
          color: #8a7e6e;
          font-family: 'IM Fell English SC', serif;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bms-seg button:hover { color: #d0c4b0; }

        .bms-seg button.active {
          background: #200c0c;
          border-color: #b01010;
          color: #ede6d8;
          box-shadow: 0 0 10px rgba(160, 10, 10, 0.35);
        }

        .bms-col-headers {
          display: flex;
          align-items: center;
          padding: 9px 14px;
          gap: 10px;
          color: #6a5a48;
          font-size: 10px;
          font-family: 'IM Fell English SC', serif;
          letter-spacing: 2px;
          text-transform: uppercase;
          border-bottom: 1px solid #221816;
          background: #0e0a08;
        }
        .bms-col-headers .bms-col-spacer { flex: 1; }
        .bms-col-headers .bms-col-h { width: 68px; text-align: center; flex-shrink: 0; }

        .bms-repo-item {
          display: flex;
          align-items: center;
          padding: 11px 14px;
          border-bottom: 1px solid #221816;
          transition: background 0.2s;
          gap: 10px;
        }

        .bms-repo-item:hover { background: #1a1210; }
        .bms-repo-item:last-child { border-bottom: none; }

        .bms-repo-col {
          width: 68px;
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          cursor: pointer;
        }

        .bms-checkbox {
          width: 17px;
          height: 17px;
          border: 1px solid #4a2828;
          background: #0a0604;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .bms-checkbox.checked {
          background: #200c0c;
          border-color: #b01010;
          box-shadow: 0 0 10px rgba(160, 10, 10, 0.35);
        }

        .bms-checkbox.checked::after {
          content: '†';
          color: #cc2020;
          font-size: 15px;
          font-weight: bold;
          line-height: 1;
        }

        .bms-repo-name {
          flex: 1;
          font-size: 14px;
          color: #b8b0a0;
          letter-spacing: 0.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bms-repo-item:hover .bms-repo-name { color: #e8e0d0; }

        .bms-badge {
          font-family: 'IM Fell English SC', serif;
          font-size: 9px;
          letter-spacing: 3px;
          color: #7a6858;
          border: 1px solid #3a2a1a;
          padding: 2px 8px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .bms-empty {
          padding: 30px 20px;
          text-align: center;
          color: #584e44;
          font-style: italic;
        }

        .bms-eye-toggle {
          background: none;
          border: none;
          color: #504030;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .bms-eye-toggle:hover { color: #cc2020; }

        .bms-theme-cards { display: flex; gap: 12px; padding: 14px; }

        .bms-theme-card {
          flex: 1;
          border: 1px solid #3a2525;
          padding: 0;
          overflow: hidden;
          cursor: pointer;
          background: none;
          font: inherit;
          color: #b8b0a0;
          text-align: center;
          transition: all 0.3s;
        }

        .bms-theme-card:hover { border-color: #6a3030; }

        .bms-theme-card.active {
          border-color: #b01010;
          box-shadow: 0 0 15px rgba(160, 10, 10, 0.35);
          color: #ede6d8;
        }

        .bms-theme-thumb { height: 58px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .bms-theme-thumb.holy { background: linear-gradient(180deg, #f4f4f6, #dcdce2); color: #444; }
        .bms-theme-thumb.hell { background: linear-gradient(180deg, #17090a, #050000); color: #c01818; }

        .bms-theme-name {
          font-family: 'IM Fell English SC', serif;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 8px 0;
        }

        @media (prefers-color-scheme: light) {
          .bms-shell { background: #f0e8d8; color: #2a1a10; }
          .bms-sidebar { background: #e8dcc8; border-right-color: #c0a090; }
          .bms-side-title { color: #1a0808; }
          .bms-nav-item { color: #6a5a48; }
          .bms-nav-item:hover { color: #2a1a10; }
          .bms-nav-item.active { color: #1a0808; border-left-color: #8b0000; }
          .bms-pane-title { color: #8b0000; }
          .bms-group { background: #e8dcc8; border-color: #c0a090; }
          .bms-row + .bms-row { border-top-color: #d0c0a8; }
          .bms-row-label { color: #2a1a10; }
          .bms-row-label .bms-row-hint { color: #6a5a48; }
          .bms-input { background: #f0e8d8; border-color: #b09070; color: #000; }
          .bms-input::placeholder { color: #9a8a78; }
          .bms-btn { background: #e0d0b8; color: #8b0000; border-color: #b09070; }
          .bms-status { color: #2d8a2d; }
          .bms-col-headers { background: #e0d4c0; border-bottom-color: #d0c0a8; color: #6a5a48; }
          .bms-repo-item { border-bottom-color: #d0c0a8; }
          .bms-repo-item:hover { background: rgba(139, 0, 0, 0.08); }
          .bms-repo-name { color: #000; }
          .bms-checkbox { background: #f0e8d8; border-color: #b09070; }
          .bms-badge { color: #6a5a48; border-color: #c0a090; }
          .bms-empty { color: #6a5a48; }
          .bms-loading-row { color: #6a5a48; }
          .bms-seg button { background: #f0e8d8; border-color: #b09070; color: #6a5a48; }
          .bms-seg button.active { background: #8b0000; border-color: #8b0000; color: #f0e8d8; }
          .bms-theme-card { border-color: #b09070; color: #2a1a10; }
          .bms-theme-card.active { border-color: #8b0000; }
          .bms-pane::-webkit-scrollbar-track { background: #e0d4c0; }
          .bms-pane::-webkit-scrollbar-thumb { background: #b09070; }
        }
      `}</style>

      <div className={`bms-shell ${flickerClass}`}>
        <NoiseCanvas opacity={0.06} />

        <nav className="bms-sidebar">
          <div className="bms-side-title">Ghast</div>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`bms-nav-item${section === item.id ? " active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="bms-pane">
          {section === "account" && (
            <>
              <div className="bms-pane-title">Soul Binding</div>
              <div className="bms-group">
                <div className="bms-row">
                  <input
                    className="bms-input"
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_..."
                    spellCheck={false}
                  />
                  <button
                    className="bms-eye-toggle"
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? "Conceal" : "Reveal"}
                  >
                    {showToken ? "◉" : "◎"}
                  </button>
                  <button className="bms-btn" onClick={handleBind} disabled={binding}>
                    {binding && <Sigil />}
                    {binding ? "Binding" : "Bind"}
                  </button>
                </div>
                {patStatus && (
                  <div className={`bms-status ${patError ? "error" : ""}`}>{patStatus}</div>
                )}
              </div>
            </>
          )}

          {section === "repositories" && (
            <>
              <div className="bms-pane-title">Haunted Repositories</div>
              <div className="bms-group">
                <div className="bms-row">
                  <input
                    className="bms-input"
                    placeholder="search the catacombs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={allRepos.length === 0}
                  />
                  {loadingRepos && <Sigil />}
                </div>
              </div>
              <div className="bms-group">
                {loadingRepos && allRepos.length === 0 ? (
                  <div className="bms-loading-row">
                    <Sigil />
                    Summoning repositories from the void...
                  </div>
                ) : allRepos.length === 0 ? (
                  <div className="bms-empty">
                    {bound
                      ? "The void holds no repositories"
                      : "Bind your soul first, under Soul Binding"}
                  </div>
                ) : (
                  <>
                    <div className="bms-col-headers">
                      <span className="bms-col-spacer">Repository</span>
                      <span className="bms-col-h">Workflows</span>
                      <span className="bms-col-h">Reviews</span>
                      <span className="bms-col-h">Mentions</span>
                    </div>
                    {filtered.length === 0 ? (
                      <div className="bms-empty">No souls found</div>
                    ) : (
                      filtered.map((repo) => (
                        <div key={repo.full_name} className="bms-repo-item">
                          <span className="bms-repo-name">{repo.full_name}</span>
                          {repo.private && <span className="bms-badge">private</span>}
                          <div className="bms-repo-col" onClick={() => toggleRepo(repo.full_name)}>
                            <div className={`bms-checkbox ${watchedSet.has(repo.full_name) ? "checked" : ""}`} />
                          </div>
                          <div className="bms-repo-col" onClick={() => toggleReviewRepo(repo.full_name)}>
                            <div className={`bms-checkbox ${reviewSet.has(repo.full_name) ? "checked" : ""}`} />
                          </div>
                          <div className="bms-repo-col" onClick={() => toggleMentionRepo(repo.full_name)}>
                            <div className={`bms-checkbox ${mentionSet.has(repo.full_name) ? "checked" : ""}`} />
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
              <div className="bms-pane-title">Vestments</div>
              <div className="bms-group">
                <div className="bms-theme-cards">
                  <button
                    className={`bms-theme-card${theme === "normal" ? " active" : ""}`}
                    onClick={() => pickTheme("normal")}
                  >
                    <div className="bms-theme-thumb holy">☼</div>
                    <div className="bms-theme-name">Holy Diver</div>
                  </button>
                  <button
                    className={`bms-theme-card${theme === "blackmetal" ? " active" : ""}`}
                    onClick={() => pickTheme("blackmetal")}
                  >
                    <div className="bms-theme-thumb hell">⛧</div>
                    <div className="bms-theme-name">Hellripper</div>
                  </button>
                </div>
              </div>
              <div className="bms-group">
                <div className="bms-row">
                  <span className="bms-row-label">
                    Script size
                    <span className="bms-row-hint">How large the inscriptions appear in the panel</span>
                  </span>
                  <div className="bms-seg">
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
              <div className="bms-pane-title">Rites</div>
              <div className="bms-group">
                <div className="bms-row">
                  <span className="bms-row-label">
                    Corpses per crypt
                    <span className="bms-row-hint">
                      Runs revealed when a resting repo is disturbed in Focus view
                    </span>
                  </span>
                  <div className="bms-seg">
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
