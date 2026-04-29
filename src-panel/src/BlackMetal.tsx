import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelPayload, PanelWorkflowRun } from "./types";

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

function formatTimeAgo(iso: string): string {
  const dt = new Date(iso);
  const now = new Date();
  const diffS = Math.floor((now.getTime() - dt.getTime()) / 1000);
  if (diffS < 60) return "just now";
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function GameIcon({
  name,
  color,
  pulse = false,
}: {
  name: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <Icon
      icon={`game-icons:${name}`}
      color={color}
      className={`bm-status-icon${pulse ? " bm-icon-pulse" : ""}`}
      style={{ "--glow": color } as React.CSSProperties}
    />
  );
}

function statusLabel(run: PanelWorkflowRun): string {
  if (run.status === "in_progress") return "Running";
  if (run.status === "queued") return "Queued";
  if (run.status === "completed") {
    switch (run.conclusion) {
      case "success": return "Succeeded";
      case "failure": return "Failed";
      case "cancelled": return "Cancelled";
      case "skipped": return "Skipped";
      case "timed_out": return "Timed out";
      case "action_required": return "Action required";
      case "neutral": return "Neutral";
      default: return "Completed";
    }
  }
  return "Unknown";
}

function StatusIcon({ run }: { run: PanelWorkflowRun }) {
  if (run.status === "in_progress")
    return <GameIcon name="eye-monster" color="#5577ee" pulse />;
  if (run.status === "queued")
    return <GameIcon name="skull-crossed-bones" color="#b8a020" />;
  if (run.status === "completed") {
    if (run.conclusion === "success")
      return <GameIcon name="pentagram-rose" color="#55aa22" />;
    if (run.conclusion === "failure")
      return <GameIcon name="crowned-skull" color="#cc2020" />;
    if (run.conclusion === "cancelled" || run.conclusion === "skipped")
      return <GameIcon name="tombstone" color="#9a8a78" />;
    if (run.conclusion === "timed_out")
      return <GameIcon name="hourglass" color="#cc6622" />;
    if (run.conclusion === "action_required")
      return <GameIcon name="crossed-swords" color="#cc8822" />;
  }
  return <GameIcon name="skull-crossed-bones" color="#9a8a78" />;
}

function RunRow({ run }: { run: PanelWorkflowRun }) {
  return (
    <div
      className="bm-run-item"
      onClick={() => invoke("open_url", { url: run.html_url })}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="bm-icon-trigger">
            <StatusIcon run={run} />
          </span>
        </TooltipTrigger>
        <TooltipContent variant="blackmetal">{statusLabel(run)}</TooltipContent>
      </Tooltip>
      <span className="bm-run-name">{run.workflow_name}</span>
      <span className="bm-run-time">{formatTimeAgo(run.created_at)}</span>
    </div>
  );
}

export default function BlackMetal({ data }: { data: PanelPayload }) {
  const [flickerClass, setFlickerClass] = useState("");

  useEffect(() => {
    setFlickerClass("screen-flicker");
    setTimeout(() => setFlickerClass(""), 600);
  }, []);

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

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .screen-flicker { animation: screenFlicker 0.6s ease-out; }

        .bm-container {
          font-family: 'IM Fell English', serif;
          background: #141210;
          color: #ddd6c8;
          height: 100vh;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 14px;
        }

        .bm-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(160, 10, 10, 0.1) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(160, 10, 10, 0.05) 0%, transparent 40%);
          pointer-events: none;
        }

        @media (prefers-color-scheme: light) {
          .bm-container {
            background: #f0e8d8;
            color: #2a1a10;
          }
          .bm-container::before {
            background:
              radial-gradient(ellipse at 50% 0%, rgba(160, 10, 10, 0.08) 0%, transparent 60%),
              radial-gradient(ellipse at 50% 100%, rgba(160, 10, 10, 0.04) 0%, transparent 40%);
          }
          .bm-container { background: #f0e8d8 !important; color: #000 !important; }
          .bm-title { color: #000 !important; text-shadow: 0 0 10px #b01010, 0 0 25px #8b0000, 0 0 50px #5a0000 !important; }
          .bm-subtitle { color: #5a4a3a !important; }
          .bm-divider { background: linear-gradient(to right, transparent, #c0a090, transparent) !important; }
          .bm-repo-header { color: #8b0000 !important; }
          .bm-run-name { color: #000 !important; }
          .bm-run-item:hover { background: rgba(139, 0, 0, 0.15) !important; }
          .bm-run-item:hover .bm-run-name { color: #000 !important; }
          .bm-run-time { color: #4a3a28 !important; }
          .bm-status-icon { filter: none !important; }
          .bm-message { color: #4a3a28 !important; }
          .bm-footer-item { color: #000 !important; }
          .bm-footer-item:hover { background: rgba(139, 0, 0, 0.15) !important; }
          .bm-repo-group + .bm-repo-group { border-top-color: #d0c0a8 !important; }
          .bm-content::-webkit-scrollbar-track { background: #e8dcc8 !important; }
          .bm-content::-webkit-scrollbar-thumb { background: #b09070 !important; }
          .bm-scratch { background: rgba(80, 50, 20, 0.04) !important; }
        }

        .bm-inner {
          padding: 16px 0 0;
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .bm-title {
          font-family: 'UnifrakturMaguntia', cursive;
          font-size: 56px;
          text-align: center;
          color: #ede6d8;
          letter-spacing: 4px;
          margin-bottom: 2px;
          animation: candleGlow 4s ease-in-out infinite;
          line-height: 1;
        }

        .bm-subtitle {
          font-family: 'IM Fell English SC', serif;
          font-size: 11px;
          text-align: center;
          letter-spacing: 4px;
          color: #7a7068;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .bm-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #5a3030, transparent);
          margin: 0;
        }

        .bm-content {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding: 6px 0;
        }

        .bm-content::-webkit-scrollbar { width: 6px; }
        .bm-content::-webkit-scrollbar-track { background: #1a1210; }
        .bm-content::-webkit-scrollbar-thumb { background: #6a3030; border-radius: 3px; }
        .bm-content::-webkit-scrollbar-thumb:hover { background: #8b4040; }

        .bm-repo-group + .bm-repo-group {
          border-top: 1px solid #1a1210;
          margin-top: 6px;
          padding-top: 6px;
        }

        .bm-repo-header {
          font-family: 'IM Fell English SC', serif;
          font-size: 10px;
          letter-spacing: 2px;
          color: #c01818;
          text-transform: uppercase;
          padding: 6px 14px 4px;
        }

        @keyframes iconPulse {
          0%, 100% { filter: drop-shadow(0 0 1px var(--glow)); opacity: 0.85; }
          50% { filter: drop-shadow(0 0 2px var(--glow)) drop-shadow(0 0 5px var(--glow)); opacity: 1; }
        }

        .bm-run-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          margin: 0 6px;
          width: calc(100% - 12px);
          box-sizing: border-box;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.15s;
          animation: fadeSlideIn 0.2s ease-out both;
        }

        .bm-run-item:hover {
          background: #2a1a18;
        }

        .bm-status-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          filter: drop-shadow(0 0 1px var(--glow));
        }

        .bm-icon-trigger {
          display: inline-flex;
          flex-shrink: 0;
        }

        .bm-icon-pulse {
          animation: iconPulse 1.8s ease-in-out infinite;
        }

        .bm-run-name {
          flex: 1;
          font-size: 14px;
          color: #e0d8c8;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bm-run-item:hover .bm-run-name {
          color: #e8e0d0;
        }

        .bm-run-time {
          font-size: 12px;
          color: #8a7e6e;
          flex-shrink: 0;
          font-style: italic;
        }

        .bm-message {
          padding: 16px 14px;
          color: #605848;
          font-size: 12px;
          font-style: italic;
          text-align: center;
        }

        .bm-footer {
          padding: 4px 0 6px;
        }

        .bm-footer-item {
          display: block;
          width: calc(100% - 12px);
          padding: 6px 8px;
          margin: 0 6px;
          border: none;
          background: none;
          color: #b8b0a0;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          border-radius: 5px;
        }

        .bm-footer-item:hover {
          background: #2a1a18;
          color: #e8e0d0;
        }

        .bm-footer-sigil {
          text-align: center;
          padding: 6px 0;
          opacity: 0.3;
        }

        .bm-scratches {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 2;
        }

        .bm-scratch {
          position: absolute;
          background: rgba(200, 192, 176, 0.03);
        }
      `}</style>

      <div className={`bm-container ${flickerClass}`}>
        <NoiseCanvas opacity={0.06} />

        <div className="bm-scratches">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bm-scratch"
              style={{
                width: 1 + Math.random() * 2,
                height: 40 + Math.random() * 150,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `rotate(${-20 + Math.random() * 40}deg)`,
                opacity: 0.04 + Math.random() * 0.06,
              }}
            />
          ))}
        </div>

        <div className="bm-inner">
          <div className="bm-title">
            <DrippingText>Ghast</DrippingText>
          </div>
          <div className="bm-subtitle">The GitHub Actions Ghost</div>
          <div className="bm-divider" />

          <div className="bm-content">
            {data.auth_error ? (
              <div className="bm-message">The binding has failed... check Settings</div>
            ) : !data.has_pat ? (
              <div className="bm-message">No soul has been bound... open Settings</div>
            ) : data.repos.length === 0 ? (
              <div className="bm-message">No repositories have been haunted</div>
            ) : (
              data.repos.map((repo) => (
                <div key={repo} className="bm-repo-group">
                  <div className="bm-repo-header">{repo}</div>
                  {data.runs[repo] ? (
                    data.runs[repo].map((run) => (
                      <RunRow key={run.html_url} run={run} />
                    ))
                  ) : (
                    <div className="bm-message">summoning...</div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="bm-divider" />
          <div className="bm-footer">
            <button className="bm-footer-item" onClick={() => invoke("open_about")}>
              About ghast...
            </button>
            <button className="bm-footer-item" onClick={() => invoke("open_settings")}>
              Settings...
            </button>
            <button className="bm-footer-item" onClick={() => invoke("quit_app")}>
              Quit ghast
            </button>
          </div>
          <div className="bm-footer-sigil">
            <Pentagram size={18} color="#5a2828" />
          </div>
        </div>
      </div>
    </>
  );
}
