import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import RunItem from "./RunItem";
import ReviewItem from "./ReviewItem";
import MentionItem from "./MentionItem";
import type { PanelPayload, PanelWorkflowRun } from "./types";
import {
  BuildsView,
  bucketRepos,
  dayLabel,
  formatTimeAgo,
  isBad,
  loadBuildsView,
  saveBuildsView,
  timeLabel,
  timelineEntries,
} from "./buildViews";

type Tab = "builds" | "reviews" | "comments";

function histClass(run: PanelWorkflowRun): string {
  if (run.status !== "completed") return "hist-run";
  if (run.conclusion === "success") return "hist-ok";
  if (isBad(run)) return "hist-fail";
  return "hist-skip";
}

function HistoryStrip({ runs }: { runs: PanelWorkflowRun[] }) {
  const last = runs.slice(-5);
  return (
    <span className="hist">
      {last.map((r, i) => (
        <i
          key={r.html_url}
          className={`${histClass(r)}${i < last.length - 1 ? " hist-dim" : ""}`}
        />
      ))}
    </span>
  );
}

function FocusRunRow({ repo, run }: { repo: string; run: PanelWorkflowRun }) {
  return (
    <button
      className="run-item"
      onClick={() => invoke("open_url", { url: run.html_url })}
    >
      <span
        className={`run-dot${run.status !== "completed" ? " dot-pulse" : ""}`}
        style={{
          backgroundColor:
            run.status !== "completed" ? "rgb(0, 122, 255)" : "rgb(255, 59, 48)",
        }}
      />
      <span className="run-name">{run.workflow_name}</span>
      <span className="repo-chip">{repo.split("/")[1] ?? repo}</span>
      <span className="run-time">{formatTimeAgo(run.created_at)}</span>
    </button>
  );
}

function FocusView({ data }: { data: PanelPayload }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { failing, running, quiet } = bucketRepos(data.repos, data.runs);

  const toggle = (repo: string) => {
    const next = new Set(expanded);
    if (next.has(repo)) next.delete(repo);
    else next.add(repo);
    setExpanded(next);
  };

  if (failing.length === 0 && running.length === 0 && quiet.length === 0) {
    return <div className="menu-message">No repos watched - check Settings</div>;
  }

  return (
    <>
      {failing.length > 0 && (
        <div className="repo-group">
          <div className="repo-header sect-fail">Failing</div>
          {failing.map(({ repo, run }) => (
            <FocusRunRow key={run.html_url} repo={repo} run={run} />
          ))}
        </div>
      )}

      {running.length > 0 && (
        <div className="repo-group">
          <div className="repo-header sect-run">Running</div>
          {running.map(({ repo, run }) => (
            <FocusRunRow key={run.html_url} repo={repo} run={run} />
          ))}
        </div>
      )}

      {quiet.length > 0 && (
        <div className="repo-group">
          <div className="repo-header">All quiet</div>
          {quiet.map(({ repo, latest, history }) => (
            <div key={repo}>
              <button className="run-item quiet-row" onClick={() => toggle(repo)}>
                <span className="quiet-check">✓</span>
                <span className="run-name">{repo}</span>
                <HistoryStrip runs={history} />
                <span className="run-time">{formatTimeAgo(latest.created_at)}</span>
              </button>
              {expanded.has(repo) &&
                [...history]
                  .reverse()
                  .map((run) => <RunItem key={run.html_url} run={run} />)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TimelineView({ data }: { data: PanelPayload }) {
  const entries = timelineEntries(data.runs);
  if (entries.length === 0) {
    return <div className="menu-message">No repos watched - check Settings</div>;
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
            {showDay && <div className="repo-header tl-day">{day}</div>}
            {showNow && (
              <div className="tl-now">
                <span className="tl-now-label">now</span>
                <span className="tl-now-line" />
              </div>
            )}
            <button
              className="run-item tl-row"
              onClick={() => invoke("open_url", { url: run.html_url })}
            >
              <span className="tl-time">{timeLabel(run.created_at)}</span>
              <span
                className={`run-dot${run.status !== "completed" ? " dot-pulse" : ""}`}
                style={{
                  backgroundColor:
                    run.status !== "completed"
                      ? "rgb(0, 122, 255)"
                      : run.conclusion === "success"
                        ? "rgb(52, 199, 89)"
                        : isBad(run)
                          ? "rgb(255, 59, 48)"
                          : "rgb(142, 142, 147)",
                }}
              />
              <span className="run-name">{run.workflow_name}</span>
              <span className="repo-chip">{repo.split("/")[1] ?? repo}</span>
            </button>
          </div>
        );
      })}
    </>
  );
}

function ReposView({ data }: { data: PanelPayload }) {
  if (data.repos.length === 0) {
    return <div className="menu-message">No repos watched - check Settings</div>;
  }
  return (
    <>
      {data.repos.map((repo) => (
        <div key={repo} className="repo-group">
          <div className="repo-header">{repo}</div>
          {data.runs[repo] ? (
            data.runs[repo].map((run) => <RunItem key={run.html_url} run={run} />)
          ) : (
            <div className="run-loading">loading...</div>
          )}
        </div>
      ))}
    </>
  );
}

const VIEWS: { id: BuildsView; label: string }[] = [
  { id: "repos", label: "Repos" },
  { id: "focus", label: "Focus" },
  { id: "timeline", label: "Timeline" },
];

export default function Menu({ data }: { data: PanelPayload }) {
  const [tab, setTab] = useState<Tab>("builds");
  const [view, setView] = useState<BuildsView>(loadBuildsView);
  const handleSettings = () => invoke("open_settings");
  const handleQuit = () => invoke("quit_app");

  const switchView = (v: BuildsView) => {
    setView(v);
    saveBuildsView(v);
  };

  const activeRunCount = Object.values(data.runs)
    .flat()
    .filter((r) => r.status === "queued" || r.status === "in_progress").length;
  const reviewCount = data.pending_reviews.length;
  const mentionCount = data.mentions.length;

  return (
    <div className="menu">
      <div className="menu-tabs">
        <button
          className={`menu-tab${tab === "builds" ? " active" : ""}`}
          onClick={() => setTab("builds")}
        >
          Builds
          {activeRunCount > 0 && <span className="menu-tab-badge">{activeRunCount}</span>}
        </button>
        <button
          className={`menu-tab${tab === "reviews" ? " active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          Reviews
          {reviewCount > 0 && <span className="menu-tab-badge">{reviewCount}</span>}
        </button>
        <button
          className={`menu-tab${tab === "comments" ? " active" : ""}`}
          onClick={() => setTab("comments")}
        >
          Comments
          {mentionCount > 0 && <span className="menu-tab-badge">{mentionCount}</span>}
        </button>
      </div>
      <div className="menu-separator" />
      {tab === "builds" && !data.auth_error && data.has_pat && (
        <div className="view-switch">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`view-btn${view === v.id ? " active" : ""}`}
              onClick={() => switchView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <div className="menu-content">
        {data.auth_error ? (
          <div className="menu-message">Auth error - check Settings</div>
        ) : !data.has_pat ? (
          <div className="menu-message">Open Settings to connect GitHub</div>
        ) : tab === "builds" ? (
          view === "repos" ? (
            <ReposView data={data} />
          ) : view === "focus" ? (
            <FocusView data={data} />
          ) : (
            <TimelineView data={data} />
          )
        ) : tab === "reviews" ? (
          data.pending_reviews.length === 0 ? (
            <div className="menu-message">No pending reviews</div>
          ) : (
            data.pending_reviews.map((r) => (
              <ReviewItem key={r.html_url} review={r} />
            ))
          )
        ) : data.mentions.length === 0 ? (
          <div className="menu-message">No unread mentions</div>
        ) : (
          data.mentions.map((m) => (
            <MentionItem key={m.html_url} mention={m} />
          ))
        )}
      </div>
      <div className="menu-separator" />
      <div className="menu-footer">
        <button className="footer-item" onClick={() => invoke("open_about")}>
          About ghast...
        </button>
        <button className="footer-item" onClick={handleSettings}>
          Settings...
        </button>
        <button className="footer-item" onClick={handleQuit}>
          Quit ghast
        </button>
      </div>
    </div>
  );
}
