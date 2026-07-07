import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelMention, PanelPayload, PanelPendingReview, PanelWorkflowRun } from "./types";
import Ghost from "./Ghost";
import {
  BuildsView,
  bucketRepos,
  chipLabel,
  dayLabel,
  isBad,
  loadBuildsView,
  saveBuildsView,
  timeLabel,
  timelineEntries,
} from "./buildViews";

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

function Glyph({
  color,
  pulse = false,
  children,
}: {
  color: string;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`bm-status-icon${pulse ? " bm-icon-pulse" : ""}`}
      style={{ "--glow": color, color } as React.CSSProperties}
    >
      {children}
    </svg>
  );
}

const STAR_PTS = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(12 + 8 * Math.cos(a)).toFixed(2)},${(12 + 8 * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
})();

const PentagramGlyph = (
  <>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <polygon points={STAR_PTS} fill="none" stroke="currentColor" strokeWidth="1.4" />
  </>
);

const SkullGlyph = (
  <>
    <path
      d="M12 3C7.5 3 4.5 6 4.5 10.5c0 2.4 1 3.6 2 4.4V18h2v-1.5h2V18h3v-1.5h2V18h2v-3.1c1-.8 2-2 2-4.4C19.5 6 16.5 3 12 3z"
      fill="currentColor"
    />
    <circle cx="9" cy="11" r="1.6" fill="#0a0303" />
    <circle cx="15" cy="11" r="1.6" fill="#0a0303" />
    <path d="M11.2 13.5h1.6v2h-1.6z" fill="#0a0303" />
  </>
);

const EyeGlyph = (
  <>
    <path
      d="M2.5 12C5 7.5 8.5 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-6 6.5-9.5 6.5s-7-2-9.5-6.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    <circle cx="13" cy="11" r="0.9" fill="#0a0303" />
  </>
);

const HourglassGlyph = (
  <>
    <path
      d="M6 4h12M6 20h12M7 4l5 8-5 8M17 4l-5 8 5 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M9 18l3-2 3 2v2H9z" fill="currentColor" />
  </>
);

const TombstoneGlyph = (
  <>
    <path
      d="M6 21V11a6 6 0 0 1 12 0v10z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 9v6M9.5 11.5h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>
);

const BrokenClockGlyph = (
  <>
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M12 12V7M12 12l3.5 2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M5 5l14 14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </>
);

const WarningGlyph = (
  <>
    <path
      d="M12 3.5L22 20.5H2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M12 9.5v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="17.8" r="1" fill="currentColor" />
  </>
);

const CrossbonesGlyph = (
  <>
    <path
      d="M5 5l14 14M19 5L5 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="5" cy="5" r="1.6" fill="currentColor" />
    <circle cx="19" cy="5" r="1.6" fill="currentColor" />
    <circle cx="5" cy="19" r="1.6" fill="currentColor" />
    <circle cx="19" cy="19" r="1.6" fill="currentColor" />
  </>
);

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
    return <Glyph color="#5577ee" pulse>{EyeGlyph}</Glyph>;
  if (run.status === "queued")
    return <Glyph color="#b8a020">{HourglassGlyph}</Glyph>;
  if (run.status === "completed") {
    if (run.conclusion === "success")
      return <Glyph color="#55aa22">{PentagramGlyph}</Glyph>;
    if (run.conclusion === "failure")
      return <Glyph color="#cc2020">{SkullGlyph}</Glyph>;
    if (run.conclusion === "cancelled" || run.conclusion === "skipped")
      return <Glyph color="#9a8a78">{TombstoneGlyph}</Glyph>;
    if (run.conclusion === "timed_out")
      return <Glyph color="#cc6622">{BrokenClockGlyph}</Glyph>;
    if (run.conclusion === "action_required")
      return <Glyph color="#cc8822">{WarningGlyph}</Glyph>;
  }
  return <Glyph color="#9a8a78">{CrossbonesGlyph}</Glyph>;
}

const ScrollGlyph = (
  <>
    <path
      d="M5 5h11a3 3 0 0 1 3 3v8a3 3 0 0 0 3 3H7a3 3 0 0 1-3-3V7a2 2 0 0 1 1-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M8 9h7M8 12h7M8 15h5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </>
);

const WhisperGlyph = (
  <>
    <path
      d="M4 5h16v11H9l-5 4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="8.5" cy="10.5" r="1" fill="currentColor" />
    <circle cx="12" cy="10.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="10.5" r="1" fill="currentColor" />
  </>
);

function MentionRow({ mention }: { mention: PanelMention }) {
  return (
    <div
      className="bm-run-item"
      onClick={() => invoke("open_url", { url: mention.html_url })}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="bm-icon-trigger">
            <Glyph color="#4696dc">{WhisperGlyph}</Glyph>
          </span>
        </TooltipTrigger>
        <TooltipContent variant="blackmetal">
          {`${mention.repo} — ${mention.subject_type}`}
        </TooltipContent>
      </Tooltip>
      <span className="bm-run-name">{mention.title}</span>
      <span className="bm-run-time">{formatTimeAgo(mention.updated_at)}</span>
    </div>
  );
}

function ReviewRow({ review }: { review: PanelPendingReview }) {
  return (
    <div
      className="bm-run-item"
      onClick={() => invoke("open_url", { url: review.html_url })}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="bm-icon-trigger">
            <Glyph color="#9b64dc">{ScrollGlyph}</Glyph>
          </span>
        </TooltipTrigger>
        <TooltipContent variant="blackmetal">
          {`${review.repo} #${review.number} — @${review.author}`}
        </TooltipContent>
      </Tooltip>
      <span className="bm-run-name">{review.title}</span>
      <span className="bm-run-time">{formatTimeAgo(review.created_at)}</span>
    </div>
  );
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

function openRepoUrl(repo: string) {
  // don't hijack a text-selection drag
  if (window.getSelection()?.toString()) return;
  invoke("open_url", { url: `https://github.com/${repo}` });
}

function bmHistClass(run: PanelWorkflowRun): string {
  if (run.status !== "completed") return "bm-hist-run";
  if (run.conclusion === "success") return "bm-hist-ok";
  if (isBad(run)) return "bm-hist-fail";
  return "bm-hist-skip";
}

function BmHistoryStrip({ runs }: { runs: PanelWorkflowRun[] }) {
  const last = runs.slice(-5);
  return (
    <span className="bm-hist">
      {last.map((r, i) => (
        <i
          key={r.html_url}
          className={`${bmHistClass(r)}${i < last.length - 1 ? " bm-hist-dim" : ""}`}
        />
      ))}
    </span>
  );
}

function BmFocusRunRow({ repo, run }: { repo: string; run: PanelWorkflowRun }) {
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
      <span
        className="bm-chip"
        onClick={(e) => {
          e.stopPropagation();
          openRepoUrl(repo);
        }}
      >
        {chipLabel(repo)}
      </span>
      <span className="bm-run-time">{formatTimeAgo(run.created_at)}</span>
    </div>
  );
}

function BmFocusView({
  data,
  expandRuns,
}: {
  data: PanelPayload;
  expandRuns: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { failing, running, quiet } = bucketRepos(data.repos, data.runs);

  const toggle = (repo: string) => {
    const next = new Set(expanded);
    if (next.has(repo)) next.delete(repo);
    else next.add(repo);
    setExpanded(next);
  };

  if (failing.length === 0 && running.length === 0 && quiet.length === 0) {
    return (
      <div className="bm-calm">
        <Ghost size={56} bodyOpacity={0.85} eyeMilkColor="#e6e0d2" eyeMilkScale={1.1} glow="#aa1010" />
        <div className="bm-calm-line">No repositories have been haunted</div>
      </div>
    );
  }

  return (
    <>
      {failing.length === 0 && running.length === 0 && (
        <div className="bm-calm">
          <Ghost size={56} bodyOpacity={0.85} eyeMilkColor="#e6e0d2" eyeMilkScale={1.1} glow="#aa1010" />
          <div className="bm-calm-line">All souls at rest</div>
        </div>
      )}

      {failing.length > 0 && (
        <div className="bm-repo-group">
          <div className="bm-repo-header bm-sect">The damned</div>
          {failing.map(({ repo, run }) => (
            <BmFocusRunRow key={run.html_url} repo={repo} run={run} />
          ))}
        </div>
      )}

      {running.length > 0 && (
        <div className="bm-repo-group">
          <div className="bm-repo-header bm-sect-run">Rituals in progress</div>
          {running.map(({ repo, run }) => (
            <BmFocusRunRow key={run.html_url} repo={repo} run={run} />
          ))}
        </div>
      )}

      {quiet.length > 0 && (
        <div className="bm-repo-group">
          <div className="bm-repo-header bm-sect-quiet">At rest</div>
          {quiet.map(({ repo, latest, history }) => (
            <div key={repo}>
              <div className="bm-run-item bm-quiet-row" onClick={() => toggle(repo)}>
                <span className="bm-quiet-check">†</span>
                <span className="bm-run-name">{repo}</span>
                <BmHistoryStrip runs={history} />
                <span className="bm-run-time">{formatTimeAgo(latest.created_at)}</span>
              </div>
              {expanded.has(repo) &&
                [...history]
                  .reverse()
                  .slice(0, expandRuns)
                  .map((run) => <RunRow key={run.html_url} run={run} />)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BmTimelineView({ data }: { data: PanelPayload }) {
  const entries = timelineEntries(data.runs);
  if (entries.length === 0) {
    return <div className="bm-message">No repositories have been haunted</div>;
  }

  let lastDay = "";
  const hasActive = entries.some(({ run }) => run.status !== "completed");

  return (
    <>
      {entries.map(({ repo, run }, i) => {
        const day = dayLabel(run.created_at);
        const showDay = day !== lastDay;
        lastDay = day;
        const showNow = hasActive && i === 0;
        return (
          <div key={run.html_url}>
            {showDay && <div className="bm-repo-header bm-sect">{day}</div>}
            {showNow && (
              <div className="bm-tl-now">
                <span className="bm-tl-now-label">the witching hour</span>
                <span className="bm-tl-now-line" />
              </div>
            )}
            <div
              className="bm-run-item"
              onClick={() => invoke("open_url", { url: run.html_url })}
            >
              <span className="bm-tl-time">{timeLabel(run.created_at)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="bm-icon-trigger">
                    <StatusIcon run={run} />
                  </span>
                </TooltipTrigger>
                <TooltipContent variant="blackmetal">{statusLabel(run)}</TooltipContent>
              </Tooltip>
              <span className="bm-run-name">{run.workflow_name}</span>
              <span
                className="bm-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  openRepoUrl(repo);
                }}
              >
                {chipLabel(repo)}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

type BmTab = "builds" | "reviews" | "comments";

const BM_TABS: BmTab[] = ["builds", "reviews", "comments"];
const BM_VIEWS: BuildsView[] = ["repos", "focus", "timeline"];
const BM_TAB_LABELS: Record<BmTab, string> = {
  builds: "Builds",
  reviews: "Reviews",
  comments: "Comments",
};

export default function BlackMetal({
  data,
  focusExpandRuns,
}: {
  data: PanelPayload;
  focusExpandRuns: number;
}) {
  const [flickerClass, setFlickerClass] = useState("");
  const [tabIdx, setTabIdx] = useState(0);
  const [view, setView] = useState<BuildsView>(loadBuildsView);

  const switchView = (v: BuildsView) => {
    setView(v);
    saveBuildsView(v);
  };

  const cycleView = (d: number) => {
    const idx = BM_VIEWS.indexOf(view);
    switchView(BM_VIEWS[(idx + d + BM_VIEWS.length) % BM_VIEWS.length]);
  };

  useEffect(() => {
    setFlickerClass("screen-flicker");
    setTimeout(() => setFlickerClass(""), 600);
  }, []);

  const activeRunCount = Object.values(data.runs)
    .flat()
    .filter((r) => r.status === "queued" || r.status === "in_progress").length;
  const counts: Record<BmTab, number> = {
    builds: activeRunCount,
    reviews: data.pending_reviews.length,
    comments: data.mentions.length,
  };
  const tab = BM_TABS[tabIdx];

  const goto = (i: number) => {
    setTabIdx((i + BM_TABS.length) % BM_TABS.length);
  };

  const ready = !data.auth_error && data.has_pat;

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
          .bm-tabs { border-bottom-color: #c0a090 !important; }
          .bm-tab { color: #6a5a48 !important; }
          .bm-tab:hover { color: #2a1a10 !important; background: rgba(139, 0, 0, 0.08) !important; }
          .bm-tab.active { color: #2a1a10 !important; border-bottom-color: #8b0000 !important; }
          .bm-tab-badge { background: #e0c8a8 !important; border-color: #b09070 !important; color: #2a1a10 !important; }
          .bm-tab.active .bm-tab-badge { background: #8b0000 !important; border-color: #8b0000 !important; color: #f0e8d8 !important; }
          .bm-pg-title { color: #1a0808 !important; }
          .bm-pg-arrow { color: #6a5a48 !important; }
          .bm-pg-arrow:hover { color: #8b0000 !important; }
          .bm-view-btn { color: #8a7a68 !important; }
          .bm-view-btn:hover { color: #2a1a10 !important; }
          .bm-view-btn.active { color: #2a1a10 !important; border-bottom-color: #8b0000 !important; }
          .bm-chip { border-color: #c0a090 !important; color: #6a5a48 !important; }
          .bm-quiet-row .bm-run-name { color: #6a5a48 !important; }
          .bm-quiet-row:hover .bm-run-name { color: #000 !important; }
          .bm-tl-time { color: #6a5a48 !important; }
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

        @keyframes bmBloodFall {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(120px); }
        }

        .bm-rain {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 96px;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .bm-blood-drop {
          position: absolute;
          top: -24px;
          border-radius: 0 0 1px 1px;
          background: linear-gradient(to bottom, transparent 0%, #6b0000 30%, #8b0000 60%, transparent 100%);
          animation: bmBloodFall linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .bm-blood-drop { animation: none; opacity: 0 !important; }
        }

        .bm-title {
          font-family: 'UnifrakturMaguntia', cursive;
          font-size: calc(56px * var(--font-scale, 1));
          text-align: center;
          color: #ede6d8;
          letter-spacing: 4px;
          margin-bottom: 2px;
          animation: candleGlow 4s ease-in-out infinite;
          line-height: 1;
          position: relative;
          z-index: 1;
        }

        .bm-subtitle {
          font-family: 'IM Fell English SC', serif;
          font-size: calc(11px * var(--font-scale, 1));
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

        .bm-tabs {
          display: flex;
          gap: 4px;
          padding: 6px 8px 0;
          margin-bottom: 6px;
          border-bottom: 1px solid #221816;
        }

        .bm-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 6px 10px;
          border: none;
          background: transparent;
          color: #6a5a48;
          font-family: 'IM Fell English SC', serif;
          font-size: calc(12px * var(--font-scale, 1));
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }

        .bm-tab:hover { color: #b8a890; background: rgba(80, 0, 0, 0.1); }

        .bm-tab.active {
          color: #e0d8c8;
          border-bottom-color: #8b0000;
          text-shadow: 0 0 6px rgba(180, 20, 20, 0.4);
        }

        .bm-tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 16px;
          padding: 0 5px;
          border-radius: 8px;
          background: #2a1010;
          border: 1px solid #4a1818;
          color: #ddc0a0;
          font-family: 'IM Fell English', serif;
          font-style: italic;
          font-size: calc(11px * var(--font-scale, 1));
          letter-spacing: 0;
        }

        .bm-tab.active .bm-tab-badge {
          background: #4a1010;
          border-color: #8b0000;
          color: #ede6d8;
        }

        .bm-container, .bm-container * {
          -webkit-user-select: none;
          user-select: none;
        }

        .bm-run-name, .bm-chip, .bm-run-time, .bm-tl-time, .bm-repo-header {
          -webkit-user-select: text;
          user-select: text;
        }

        .bm-sect, .bm-sect-run, .bm-sect-quiet, .bm-calm-line {
          -webkit-user-select: none !important;
          user-select: none !important;
        }

        .bm-calm {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 18px 0 10px;
        }

        .bm-calm-line {
          color: #8a7e6e;
          font-style: italic;
          font-size: calc(12px * var(--font-scale, 1));
        }

        .bm-pager-head {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px 8px;
          position: relative;
        }

        .bm-pg-arrow {
          border: none;
          background: transparent;
          color: #8a7e6e;
          font-family: 'IM Fell English', serif;
          font-size: 20px;
          line-height: 1;
          padding: 0 12px 3px;
          cursor: pointer;
          transition: color 0.2s, text-shadow 0.2s;
        }

        .bm-pg-arrow:hover {
          color: #dd3030;
          text-shadow: 0 0 8px rgba(180, 20, 20, 0.5);
        }

        .bm-pg-title {
          flex: none;
          min-width: 120px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'IM Fell English SC', serif;
          font-size: calc(13px * var(--font-scale, 1));
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #ede6d8;
          text-shadow: 0 0 6px rgba(180, 20, 20, 0.4);
        }

        .bm-pager-clip {
          overflow: hidden;
          min-height: 0;
          flex: 1;
          display: flex;
        }

        .bm-pager-strip {
          display: flex;
          width: 300%;
          transition: transform 240ms cubic-bezier(0.25, 0.8, 0.3, 1);
          align-items: stretch;
        }

        .bm-pager-page {
          width: 33.3333%;
          flex-shrink: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .bm-pager-strip { transition: none; }
        }

        .bm-repo-link {
          display: block;
          width: 100%;
          border: none;
          background: none;
          -webkit-appearance: none;
          appearance: none;
          border-radius: 0;
          cursor: pointer;
          text-align: left;
        }

        .bm-repo-link:hover {
          color: #dd3030;
          text-shadow: 0 0 6px rgba(200, 20, 20, 0.3);
        }

        .bm-view-pager {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 2px 10px 0;
        }

        .bm-pg-arrow-sm {
          font-size: 15px;
          padding: 0 9px 2px;
        }

        .bm-view-pager-label {
          color: #8a7e6e;
          font-family: 'IM Fell English SC', serif;
          font-size: calc(10px * var(--font-scale, 1));
          letter-spacing: 2px;
          text-transform: uppercase;
          min-width: 84px;
          text-align: center;
        }

        .bm-view-switch {
          display: flex;
          gap: 4px;
          padding: 4px 10px 0;
          justify-content: center;
        }

        .bm-view-btn {
          border: none;
          background: transparent;
          color: #6a5a48;
          font-family: 'IM Fell English SC', serif;
          font-size: calc(10px * var(--font-scale, 1));
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 2px 10px;
          cursor: pointer;
          border-bottom: 1px solid transparent;
        }

        .bm-view-btn:hover { color: #b8a890; }

        .bm-view-btn.active {
          color: #ddc0a0;
          border-bottom-color: #8b0000;
        }

        .bm-chip {
          font-family: 'IM Fell English SC', serif;
          font-size: calc(10px * var(--font-scale, 1));
          letter-spacing: 1px;
          padding: 1px 7px;
          border: 1px solid #3a2a1a;
          color: #8a7e6e;
          flex-shrink: 0;
          width: calc(100px * var(--font-scale, 1));
          box-sizing: border-box;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bm-sect-run { color: #5577ee !important; }
        .bm-sect-quiet { color: #6a7a48 !important; }

        .bm-quiet-row .bm-run-name { color: #9a8e7e; }
        .bm-quiet-row:hover .bm-run-name { color: #e0d8c8; }

        .bm-quiet-check {
          color: #55aa22;
          font-size: calc(13px * var(--font-scale, 1));
          width: 16px;
          text-align: center;
          flex-shrink: 0;
        }

        .bm-hist {
          display: inline-flex;
          gap: 2.5px;
          flex-shrink: 0;
        }

        .bm-hist i {
          width: 7px;
          height: 7px;
          display: block;
        }

        .bm-hist .bm-hist-ok { background: #55aa22; }
        .bm-hist .bm-hist-fail { background: #cc2020; }
        .bm-hist .bm-hist-skip { background: #9a8a78; opacity: 0.6; }
        .bm-hist .bm-hist-run { background: #5577ee; }
        .bm-hist .bm-hist-dim { opacity: 0.4; }

        .bm-tl-time {
          width: 40px;
          flex-shrink: 0;
          text-align: right;
          color: #8a7e6e;
          font-size: calc(11px * var(--font-scale, 1));
          font-variant-numeric: tabular-nums;
        }

        .bm-tl-now {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 2px 14px 2px 56px;
        }

        .bm-tl-now-label {
          font-family: 'IM Fell English SC', serif;
          font-size: calc(9px * var(--font-scale, 1));
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #c01818;
          white-space: nowrap;
        }

        .bm-tl-now-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, #8b0000, transparent);
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
          font-size: calc(10px * var(--font-scale, 1));
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
          font-size: calc(14px * var(--font-scale, 1));
          color: #e0d8c8;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bm-run-item:hover .bm-run-name {
          color: #e8e0d0;
        }

        .bm-run-time {
          font-size: calc(12px * var(--font-scale, 1));
          color: #8a7e6e;
          flex-shrink: 0;
          font-style: italic;
          min-width: calc(62px * var(--font-scale, 1));
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .bm-message {
          padding: 16px 14px;
          color: #605848;
          font-size: calc(12px * var(--font-scale, 1));
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
          font-size: calc(13px * var(--font-scale, 1));
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
          <div className="bm-rain">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="bm-blood-drop"
                style={{
                  left: `${Math.random() * 100}%`,
                  width: 1 + Math.random() * 2,
                  height: 10 + Math.random() * 22,
                  opacity: 0.1 + Math.random() * 0.2,
                  animationDelay: `${Math.random() * 4}s`,
                  animationDuration: `${1.6 + Math.random() * 2.6}s`,
                }}
              />
            ))}
          </div>
          <div className="bm-title">
            <DrippingText>Ghast</DrippingText>
          </div>
          <div className="bm-subtitle">The GitHub Actions Ghost</div>

          <div className="bm-pager-head">
            <button className="bm-pg-arrow" onClick={() => goto(tabIdx - 1)} aria-label="Previous section">
              ‹
            </button>
            <div className="bm-pg-title">
              {BM_TAB_LABELS[tab]}
              {counts[tab] > 0 && <span className="bm-tab-badge">{counts[tab]}</span>}
            </div>
            <button className="bm-pg-arrow" onClick={() => goto(tabIdx + 1)} aria-label="Next section">
              ›
            </button>
          </div>

          {tab === "builds" && ready && (
            <div className="bm-view-pager">
              <button
                className="bm-pg-arrow bm-pg-arrow-sm"
                onClick={() => cycleView(-1)}
                aria-label="Previous view"
              >
                ‹
              </button>
              <span className="bm-view-pager-label">{view}</span>
              <button
                className="bm-pg-arrow bm-pg-arrow-sm"
                onClick={() => cycleView(1)}
                aria-label="Next view"
              >
                ›
              </button>
            </div>
          )}

          {!ready ? (
            <div className="bm-content">
              {data.auth_error ? (
                <div className="bm-message">The binding has failed... check Settings</div>
              ) : (
                <div className="bm-message">No soul has been bound... open Settings</div>
              )}
            </div>
          ) : (
            <div className="bm-pager-clip">
              <div
                className="bm-pager-strip"
                style={{ transform: `translateX(-${tabIdx * 33.3333}%)` }}
              >
                <div className="bm-pager-page bm-content">
                  {view === "focus" ? (
                    <BmFocusView data={data} expandRuns={focusExpandRuns} />
                  ) : view === "timeline" ? (
                    <BmTimelineView data={data} />
                  ) : data.repos.length === 0 ? (
                    <div className="bm-message">No repositories have been haunted</div>
                  ) : (
                    data.repos.map((repo) => (
                      <div key={repo} className="bm-repo-group">
                        <button
                          className="bm-repo-header bm-repo-link"
                          onClick={() => openRepoUrl(repo)}
                        >
                          {repo}
                        </button>
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
                <div className="bm-pager-page bm-content">
                  {data.pending_reviews.length === 0 ? (
                    <div className="bm-message">No souls awaiting judgment</div>
                  ) : (
                    data.pending_reviews.map((r) => (
                      <ReviewRow key={r.html_url} review={r} />
                    ))
                  )}
                </div>
                <div className="bm-pager-page bm-content">
                  {data.mentions.length === 0 ? (
                    <div className="bm-message">The whispers have fallen silent</div>
                  ) : (
                    data.mentions.map((m) => (
                      <MentionRow key={m.html_url} mention={m} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

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
