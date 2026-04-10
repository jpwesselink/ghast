import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

const year = new Date().getFullYear();

function NoiseCanvas({ opacity = 0.06 }: { opacity?: number }) {
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

function Link({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <a className="about-link" onClick={() => invoke("open_url", { url })}>
      {children}
    </a>
  );
}

function CleanAbout() {
  return (
    <>
      <style>{`
        .about {
          font: menu;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 24px;
          box-sizing: border-box;
          text-align: center;
          user-select: none;
          overflow: hidden;
          background: var(--about-bg);
          color: var(--about-text);
          --about-bg: #f5f5f5;
          --about-text: #1d1d1f;
          --about-secondary: #86868b;
          --about-link: #0064e0;
        }
        @media (prefers-color-scheme: dark) {
          .about {
            --about-bg: #1c1c1e;
            --about-text: #f5f5f7;
            --about-secondary: #86868b;
            --about-link: #0a84ff;
          }
        }
        .about-icon { width: 64px; height: 64px; margin-bottom: 12px; }
        .about-name { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
        .about-tagline { font-size: 0.85em; color: var(--about-secondary); margin-bottom: 16px; }
        .about-version { font-size: 0.85em; color: var(--about-secondary); margin-bottom: 16px; }
        .about-copy { font-size: 0.85em; color: var(--about-secondary); line-height: 1.6; }
        .about-link { color: var(--about-link); text-decoration: none; cursor: pointer; }
        .about-link:hover { text-decoration: underline; }
        .about-credits { font-size: 0.78em; color: var(--about-secondary); margin-top: 16px; line-height: 1.5; opacity: 0.8; }
      `}</style>
      <div className="about">
        <img className="about-icon" src="/icons/128x128.png" alt="ghast" />
        <div className="about-name">ghast</div>
        <div className="about-tagline">GitHub Actions Status Tracker</div>
        <div className="about-version">Version 0.1.0</div>
        <div className="about-copy">
          &copy; {year} JP Wesselink<br />
          <Link url="https://opensource.org/licenses/MIT">MIT License</Link>
          {" / "}
          <Link url="https://github.com/jpwesselink/ghast">Source on GitHub</Link>
        </div>
        <div className="about-credits">
          Status icons by <Link url="https://game-icons.net">Game Icons</Link> authors (CC BY 3.0)<br />
          served via <Link url="https://iconify.design">Iconify</Link>
        </div>
      </div>
    </>
  );
}

function HellripperAbout() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&display=swap');

        @keyframes candleGlow {
          0%, 100% { text-shadow: 0 0 8px #b01010, 0 0 20px #8b0000, 0 0 40px #5a0000; }
          33% { text-shadow: 0 0 12px #cc2020, 0 0 25px #a00000, 0 0 50px #5a0000; }
          66% { text-shadow: 0 0 6px #901010, 0 0 16px #8b0000, 0 0 35px #4a0000; }
        }

        @keyframes flicker {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }

        @keyframes bloodFall {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(calc(100vh + 100%)); }
        }

        .bm-about {
          font-family: 'IM Fell English', serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 24px;
          box-sizing: border-box;
          text-align: center;
          user-select: none;
          position: relative;
          overflow: hidden;
          background: #0a0808;
          color: #ddd6c8;
        }

        .bm-about::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 20%, rgba(160, 10, 10, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 80%, rgba(100, 5, 5, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        @media (prefers-color-scheme: light) {
          .bm-about {
            background: #f0e8d8;
            color: #2a1a10;
          }
          .bm-about::before {
            background:
              radial-gradient(ellipse at 50% 20%, rgba(160, 10, 10, 0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 50% 80%, rgba(100, 5, 5, 0.03) 0%, transparent 50%);
          }
          .bm-about-title { color: #1a0808 !important; }
          .bm-about-subtitle { color: #6a5a48 !important; }
          .bm-about-secondary { color: #6a5a48 !important; }
          .bm-about-link { color: #8b0000 !important; }
          .bm-about-divider { background: linear-gradient(to right, transparent, #c0a090, transparent) !important; }
          .bm-about-icon { filter: none !important; }
        }

        .bm-about-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bm-about-icon {
          width: 72px;
          height: 72px;
          margin-bottom: 10px;
          filter: drop-shadow(0 0 12px rgba(180, 20, 20, 0.4));
        }

        .bm-about-title {
          font-family: 'UnifrakturMaguntia', cursive;
          font-size: 52px;
          color: #ede6d8;
          letter-spacing: 3px;
          animation: candleGlow 4s ease-in-out infinite;
          line-height: 1;
          margin-bottom: 4px;
        }

        .bm-about-subtitle {
          font-family: 'IM Fell English SC', serif;
          font-size: 12px;
          letter-spacing: 4px;
          color: #7a7068;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .bm-about-divider {
          width: 60%;
          height: 1px;
          background: linear-gradient(to right, transparent, #5a3030, transparent);
          margin: 12px 0;
        }

        .bm-about-version {
          font-family: 'IM Fell English SC', serif;
          font-size: 13px;
          letter-spacing: 3px;
          color: #7a7068;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .bm-about-secondary {
          font-size: 15px;
          color: #8a7e6e;
          font-style: italic;
          line-height: 1.7;
        }

        .bm-about-link {
          color: #c01818;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
        }

        .bm-about-link:hover {
          color: #ee3838;
          text-shadow: 0 0 6px rgba(200, 20, 20, 0.3);
        }

        .bm-about-credits {
          font-size: 13px;
          color: #605848;
          margin-top: 16px;
          line-height: 1.6;
          font-style: italic;
        }

        .bm-about-sigil {
          margin-top: 16px;
          opacity: 0.25;
        }

        .bm-about-rain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .bm-blood-drop {
          position: absolute;
          top: -20px;
          width: 1.5px;
          border-radius: 0 0 1px 1px;
          background: linear-gradient(to bottom, transparent 0%, #6b0000 30%, #8b0000 60%, transparent 100%);
          animation: bloodFall linear infinite;
        }
      `}</style>
      <div className="bm-about">
        <NoiseCanvas opacity={0.05} />

        <div className="bm-about-rain">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="bm-blood-drop"
              style={{
                left: `${Math.random() * 100}%`,
                width: 1 + Math.random() * 2,
                height: 12 + Math.random() * 30,
                opacity: 0.08 + Math.random() * 0.18,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${1.5 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        <div className="bm-about-inner">
          <img className="bm-about-icon" src="/icons/128x128.png" alt="ghast" />
          <div className="bm-about-title">Ghast</div>
          <div className="bm-about-subtitle">The GitHub Actions Ghost</div>
          <div className="bm-about-version">v0.1.0</div>

          <div className="bm-about-divider" />

          <div className="bm-about-secondary">
            &copy; {year} JP Wesselink<br />
            <Link url="https://opensource.org/licenses/MIT">
              <span className="bm-about-link">MIT License</span>
            </Link>
            {" / "}
            <Link url="https://github.com/jpwesselink/ghast">
              <span className="bm-about-link">Source on GitHub</span>
            </Link>
          </div>

          <div className="bm-about-credits">
            Occult icons by{" "}
            <Link url="https://game-icons.net"><span className="bm-about-link">Game Icons</span></Link>{" "}
            authors (CC BY 3.0)<br />
            served via{" "}
            <Link url="https://iconify.design"><span className="bm-about-link">Iconify</span></Link>
          </div>

          <div className="bm-about-sigil">
            <Pentagram size={24} color="#5a2828" />
          </div>
        </div>
      </div>
    </>
  );
}

export default function About() {
  const blackMetal = localStorage.getItem("ghast-theme") === "blackmetal";
  return blackMetal ? <HellripperAbout /> : <CleanAbout />;
}
