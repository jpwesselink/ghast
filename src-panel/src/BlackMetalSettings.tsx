import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GitHubRepo {
  full_name: string;
  private: boolean;
  description: string | null;
}

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

function Pentagram({ size = 20, color = "#8b0000" }: { size?: number; color?: string }) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${50 + 45 * Math.cos(angle)},${50 + 45 * Math.sin(angle)}`);
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polygon points={pts.join(" ")} fill="none" stroke={color} strokeWidth="3" />
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function InvertedCross({ size = 16, color = "#8b0000" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 30 50" width={size} height={size * 1.6} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="12" y="0" width="6" height="45" fill={color} />
      <rect x="4" y="28" width="22" height="5" fill={color} />
    </svg>
  );
}

function DrippingText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span style={{
        position: "absolute", bottom: -8, left: "20%", width: 2, height: 12,
        background: "linear-gradient(to bottom, #b01010, transparent)", borderRadius: "0 0 1px 1px",
      }} />
      <span style={{
        position: "absolute", bottom: -14, left: "60%", width: 2, height: 18,
        background: "linear-gradient(to bottom, #b01010, transparent)", borderRadius: "0 0 1px 1px",
      }} />
      <span style={{
        position: "absolute", bottom: -6, left: "80%", width: 1.5, height: 9,
        background: "linear-gradient(to bottom, #b01010, transparent)", borderRadius: "0 0 1px 1px",
      }} />
    </span>
  );
}

export default function BlackMetalSettings() {
  const [token, setToken] = useState("");
  const [bound, setBound] = useState(false);
  const [boundLogin, setBoundLogin] = useState("");
  const [allRepos, setAllRepos] = useState<GitHubRepo[]>([]);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [flickerClass, setFlickerClass] = useState("");
  const [unleashPulse, setUnleashPulse] = useState(false);
  const [patStatus, setPatStatus] = useState("");
  const [patError, setPatError] = useState(false);
  const [repoStatus, setRepoStatus] = useState("");

  useEffect(() => {
    invoke<{ github_pat: string; watched_repos: string[] }>("get_config").then((config) => {
      if (config.github_pat) {
        setToken(config.github_pat);
        setBound(true);
        setPatStatus("Soul bound");
        setWatchedSet(new Set(config.watched_repos));
        loadRepos();
      }
    });
  }, []);

  async function loadRepos() {
    try {
      const repos = await invoke<GitHubRepo[]>("get_repos");
      setAllRepos(repos);
    } catch (e) {
      setPatStatus(`The ritual failed: ${e}`);
      setPatError(true);
    }
  }

  const filtered = allRepos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRepo = (name: string) => {
    setWatchedSet((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleBind = async () => {
    const pat = token.trim();
    if (!pat) return;
    setPatStatus("Performing the ritual...");
    setPatError(false);
    try {
      const login = await invoke<string>("save_pat", { pat });
      setBound(true);
      setBoundLogin(login);
      setPatStatus(`Bound to ${login}`);
      setFlickerClass("screen-flicker");
      setTimeout(() => setFlickerClass(""), 600);
      await loadRepos();
    } catch (e) {
      setPatStatus(`Binding failed: ${e}`);
      setPatError(true);
    }
  };

  const handleUnleash = async () => {
    setUnleashPulse(true);
    setTimeout(() => setUnleashPulse(false), 1000);
    try {
      await invoke("set_watched_repos", { repos: Array.from(watchedSet) });
      setRepoStatus(`Haunting ${watchedSet.size} repo(s)`);
    } catch (e) {
      setRepoStatus(`Failed: ${e}`);
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

        @keyframes pulseRed {
          0% { box-shadow: 0 0 5px #8b0000; }
          50% { box-shadow: 0 0 25px #8b0000, 0 0 50px #4a0000; }
          100% { box-shadow: 0 0 5px #8b0000; }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .screen-flicker { animation: screenFlicker 0.6s ease-out; }

        .bms-container {
          font-family: 'IM Fell English', serif;
          background: #080808;
          color: #ddd6c8;
          min-height: 100vh;
          position: relative;
        }

        .bms-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(160, 10, 10, 0.1) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(160, 10, 10, 0.05) 0%, transparent 40%);
          pointer-events: none;
        }

        .bms-inner {
          max-width: 640px;
          margin: 0 auto;
          padding: 8px 24px 16px;
          position: relative;
          z-index: 1;
        }

        .bms-title {
          font-family: 'UnifrakturMaguntia', cursive;
          font-size: 32px;
          text-align: center;
          color: #ede6d8;
          letter-spacing: 4px;
          margin-bottom: 0;
          animation: candleGlow 4s ease-in-out infinite;
          line-height: 1;
        }

        .bms-subtitle {
          font-family: 'IM Fell English SC', serif;
          font-size: 9px;
          text-align: center;
          letter-spacing: 4px;
          color: #7a7068;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .bms-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0 6px;
          justify-content: center;
        }

        .bms-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, #5a3030, transparent);
        }

        .bms-section-title {
          font-family: 'IM Fell English SC', serif;
          font-size: 13px;
          letter-spacing: 5px;
          color: #c01818;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .bms-input-wrap { position: relative; margin-bottom: 6px; }

        .bms-input {
          width: 100%;
          box-sizing: border-box;
          background: #0c0a08;
          border: 1px solid #3a2525;
          color: #ddd6c8;
          font-family: 'IM Fell English', serif;
          font-size: 14px;
          padding: 10px 14px;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s;
        }

        .bms-input:focus {
          border-color: #b01010;
          box-shadow: 0 0 15px rgba(160, 10, 10, 0.3);
        }

        .bms-input::placeholder { color: #584e44; font-style: italic; }

        .bms-token-row {
          display: flex;
          gap: 12px;
          align-items: stretch;
        }

        .bms-token-row .bms-input-wrap {
          flex: 1;
          display: flex;
        }

        .bms-token-row .bms-input {
          flex: 1;
          height: 42px;
          box-sizing: border-box;
          font-family: monospace;
          font-size: 13px;
          letter-spacing: 1px;
          padding: 0 14px;
        }

        .bms-token-row .bms-btn {
          height: 42px;
          padding: 0 28px;
        }

        .bms-btn {
          font-family: 'IM Fell English SC', serif;
          font-size: 13px;
          letter-spacing: 4px;
          text-transform: uppercase;
          background: #1a0808;
          color: #b01010;
          border: 1px solid #4a2020;
          padding: 12px 28px;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .bms-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(160, 10, 10, 0.15), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .bms-btn:hover {
          border-color: #b01010;
          color: #dd3030;
          box-shadow: 0 0 25px rgba(160, 10, 10, 0.4);
        }

        .bms-btn:hover::before { opacity: 1; }
        .bms-btn:active { transform: scale(0.97); }

        .bms-status {
          font-size: 12px;
          font-style: italic;
          color: #78b830;
          margin-top: 8px;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bms-status.error { color: #cc3333; }

        .bms-status-dot {
          width: 6px;
          height: 6px;
          background: #78b830;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #78b830;
        }

        .bms-repo-list {
          border: 1px solid #2a1a18;
          background: #060504;
          max-height: 400px;
          overflow-y: auto;
          overflow-x: hidden;
          margin-top: 12px;
        }

        .bms-repo-list::-webkit-scrollbar { width: 6px; }
        .bms-repo-list::-webkit-scrollbar-track { background: #0a0806; }
        .bms-repo-list::-webkit-scrollbar-thumb { background: #3a2525; border-radius: 3px; }

        .bms-repo-item {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid #221816;
          cursor: pointer;
          transition: background 0.2s;
          animation: fadeSlideIn 0.3s ease-out both;
        }

        .bms-repo-item:hover { background: #1a1210; }
        .bms-repo-item:last-child { border-bottom: none; }

        .bms-checkbox {
          width: 18px;
          height: 18px;
          border: 1px solid #4a2828;
          background: #0a0604;
          margin-right: 14px;
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
          content: '\u2020';
          color: #cc2020;
          font-size: 16px;
          font-weight: bold;
          line-height: 1;
        }

        .bms-repo-name {
          flex: 1;
          font-size: 14px;
          color: #b8b0a0;
          letter-spacing: 0.5px;
        }

        .bms-repo-item:hover .bms-repo-name { color: #e8e0d0; }

        .bms-badge {
          font-family: 'IM Fell English SC', serif;
          font-size: 9px;
          letter-spacing: 3px;
          color: #7a6858;
          border: 1px solid #3a2a1a;
          padding: 3px 10px;
          text-transform: uppercase;
        }

        .bms-unleash-wrap {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }

        .bms-unleash {
          font-family: 'UnifrakturMaguntia', cursive;
          font-size: 22px;
          letter-spacing: 3px;
          background: #1a0808;
          color: #b01010;
          border: 1px solid #4a2020;
          padding: 14px 36px;
          cursor: pointer;
          transition: all 0.4s;
        }

        .bms-unleash:hover {
          border-color: #b01010;
          color: #ee3838;
          box-shadow: 0 0 35px rgba(180, 15, 15, 0.5), inset 0 0 35px rgba(160, 10, 10, 0.15);
          text-shadow: 0 0 15px #cc2020;
        }

        .bms-unleash.pulse { animation: pulseRed 0.5s ease-out 2; }

        .bms-header-decoration {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 8px;
          opacity: 0.55;
        }

        .bms-footer-sigil {
          text-align: center;
          margin-top: 16px;
          opacity: 0.4;
        }

        .bms-scratches {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 2;
        }

        .bms-scratch {
          position: absolute;
          background: rgba(200, 192, 176, 0.03);
        }

        .bms-eye-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #504030;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .bms-eye-toggle:hover { color: #cc2020; }

        .bms-empty {
          padding: 30px 20px;
          text-align: center;
          color: #584e44;
          font-style: italic;
        }

        .bms-repo-status {
          font-size: 12px;
          font-style: italic;
          color: #cc7733;
          letter-spacing: 1px;
          flex: 1;
        }

        @media (prefers-color-scheme: light) {
          .bms-container { background: #f0e8d8 !important; color: #000 !important; }
          .bms-container::before {
            background:
              radial-gradient(ellipse at 50% 0%, rgba(160, 10, 10, 0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 50% 100%, rgba(160, 10, 10, 0.03) 0%, transparent 40%) !important;
          }
          .bms-title { color: #000 !important; text-shadow: 0 0 10px #b01010, 0 0 25px #8b0000 !important; }
          .bms-subtitle { color: #6a5a48 !important; }
          .bms-section-title { color: #8b0000 !important; }
          .bms-divider-line { background: linear-gradient(to right, transparent, #c0a090, transparent) !important; }
          .bms-input { background: #e8dcc8 !important; border-color: #c0a090 !important; color: #000 !important; }
          .bms-input::placeholder { color: #9a8a78 !important; }
          .bms-input:focus { border-color: #8b0000 !important; box-shadow: 0 0 10px rgba(139, 0, 0, 0.2) !important; }
          .bms-btn { background: #e0d0b8 !important; color: #8b0000 !important; border-color: #b09070 !important; }
          .bms-btn:hover { border-color: #8b0000 !important; box-shadow: 0 0 15px rgba(139, 0, 0, 0.3) !important; }
          .bms-status { color: #2d8a2d !important; }
          .bms-status-dot { background: #2d8a2d !important; box-shadow: 0 0 6px #2d8a2d !important; }
          .bms-repo-list { background: #e8dcc8 !important; border-color: #c0a090 !important; }
          .bms-repo-item { border-bottom-color: #d0c0a8 !important; }
          .bms-repo-item:hover { background: rgba(139, 0, 0, 0.08) !important; }
          .bms-repo-name { color: #000 !important; }
          .bms-checkbox { background: #f0e8d8 !important; border-color: #b09070 !important; }
          .bms-checkbox.checked { background: #8b0000 !important; border-color: #8b0000 !important; }
          .bms-checkbox.checked::after { color: #f0e8d8 !important; }
          .bms-badge { color: #6a5a48 !important; border-color: #c0a090 !important; }
          .bms-unleash { background: #e0d0b8 !important; color: #8b0000 !important; border-color: #b09070 !important; }
          .bms-unleash:hover { border-color: #8b0000 !important; color: #cc0000 !important; }
          .bms-empty { color: #6a5a48 !important; }
          .bms-repo-status { color: #8b4400 !important; }
          .bms-eye-toggle { color: #9a8a78 !important; }
          .bms-eye-toggle:hover { color: #8b0000 !important; }
          .bms-scratch { background: rgba(80, 50, 20, 0.03) !important; }
          .bms-repo-list::-webkit-scrollbar-track { background: #e0d4c0 !important; }
          .bms-repo-list::-webkit-scrollbar-thumb { background: #b09070 !important; }
        }
      `}</style>

      <div className={`bms-container ${flickerClass}`}>
        <NoiseCanvas opacity={0.06} />

        <div className="bms-scratches">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="bms-scratch"
              style={{
                width: 1 + Math.random() * 2,
                height: 40 + Math.random() * 200,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `rotate(${-20 + Math.random() * 40}deg)`,
                opacity: 0.04 + Math.random() * 0.06,
              }}
            />
          ))}
        </div>

        <div className="bms-inner">
          <div className="bms-title">Ghast</div>
          <div className="bms-subtitle">The GitHub Actions Ghost</div>

          <div className="bms-divider">
            <div className="bms-divider-line" />
            <Pentagram size={16} color="#8a2828" />
            <span className="bms-section-title">Soul Binding</span>
            <Pentagram size={16} color="#8a2828" />
            <div className="bms-divider-line" />
          </div>

          <div className="bms-token-row">
            <div className="bms-input-wrap" style={{ flex: 1 }}>
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
                {showToken ? "\u25C9" : "\u25CE"}
              </button>
            </div>
            <button className="bms-btn" onClick={handleBind}>
              Bind
            </button>
          </div>

          {patStatus && (
            <div className={`bms-status ${patError ? "error" : ""}`}>
              {!patError && <span className="bms-status-dot" />}
              {patStatus}
            </div>
          )}

          <div className="bms-divider">
            <div className="bms-divider-line" />
            <Pentagram size={16} color="#8a2828" />
            <span className="bms-section-title">Haunted Repositories</span>
            <Pentagram size={16} color="#8a2828" />
            <div className="bms-divider-line" />
          </div>

          <div className="bms-input-wrap">
            <input
              className="bms-input"
              placeholder="search the catacombs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={allRepos.length === 0}
            />
          </div>

          <div className="bms-repo-list">
            {allRepos.length === 0 ? (
              <div className="bms-empty">
                {bound ? "Summoning repositories..." : "Bind your soul to reveal the repositories"}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bms-empty">No souls found</div>
            ) : (
              filtered.map((repo, i) => (
                <div
                  key={repo.full_name}
                  className="bms-repo-item"
                  onClick={() => toggleRepo(repo.full_name)}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className={`bms-checkbox ${watchedSet.has(repo.full_name) ? "checked" : ""}`} />
                  <span className="bms-repo-name">{repo.full_name}</span>
                  {repo.private && <span className="bms-badge">private</span>}
                </div>
              ))
            )}
          </div>

          <div className="bms-unleash-wrap">
            {repoStatus && <span className="bms-repo-status">{repoStatus}</span>}
            <button
              className={`bms-unleash ${unleashPulse ? "pulse" : ""}`}
              onClick={handleUnleash}
              disabled={allRepos.length === 0}
            >
              Unleash
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
