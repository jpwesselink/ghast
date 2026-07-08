import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import RunItem from "./RunItem";
import ReviewItem from "./ReviewItem";
import MentionItem from "./MentionItem";
import Ghost from "./Ghost";
import JobSteps from "./JobSteps";
import { toggleRunExpanded, useExpandedRuns } from "./runJobs";
import type { PanelPayload, PanelWorkflowRun } from "./types";
import {
  bucketRepos,
  chipLabel,
  dayLabel,
  formatTimeAgo,
  isBad,
  timeLabel,
  timelineEntries,
} from "./buildViews";

function openRepoUrl(repo: string) {
  // don't hijack a text-selection drag
  if (window.getSelection()?.toString()) return;
  invoke("open_url", { url: `https://github.com/${repo}` });
}

function histClass(run: PanelWorkflowRun): string {
  if (run.status === "waiting") return "hist-wait";
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
  const expanded = useExpandedRuns().includes(run.run_id);
  return (
    <>
    <div
      className="run-item"
      onClick={() => invoke("open_url", { url: run.html_url })}
    >
      <span
        className={`run-chevron${expanded ? " open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleRunExpanded(run.run_id);
        }}
      >
        ›
      </span>
      <span
        className={`run-dot${run.status !== "completed" ? " dot-pulse" : ""}`}
        style={{
          backgroundColor:
            run.status === "waiting"
              ? "rgb(255, 149, 0)"
              : run.status !== "completed"
                ? "rgb(0, 122, 255)"
                : "rgb(255, 59, 48)",
        }}
      />
      <span className="run-name">{run.workflow_name}</span>
      <span
        className="repo-chip"
        onClick={(e) => {
          e.stopPropagation();
          openRepoUrl(repo);
        }}
      >
        {chipLabel(repo)}
      </span>
      <span className="run-time">{formatTimeAgo(run.created_at)}</span>
    </div>
    {expanded && <JobSteps run={run} variant="clean" />}
    </>
  );
}

function FocusView({
  data,
  expandRuns,
}: {
  data: PanelPayload;
  expandRuns: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { failing, waiting, running, quiet } = bucketRepos(data.repos, data.runs);

  const toggle = (repo: string) => {
    const next = new Set(expanded);
    if (next.has(repo)) next.delete(repo);
    else next.add(repo);
    setExpanded(next);
  };

  if (
    failing.length === 0 &&
    waiting.length === 0 &&
    running.length === 0 &&
    quiet.length === 0
  ) {
    return (
      <div className="calm-ghost">
        <Ghost size={56} bodyColor="var(--ghost-body)" eyeMilkColor="#ffffff" eyeMilkScale={0.8} />
        <div className="calm-line">No repos watched - check Settings</div>
      </div>
    );
  }

  return (
    <>
      {failing.length === 0 && waiting.length === 0 && running.length === 0 && (
        <div className="calm-ghost">
          <Ghost size={56} bodyColor="var(--ghost-body)" eyeMilkColor="#ffffff" eyeMilkScale={0.8} />
          <div className="calm-line">Nothing haunts you</div>
        </div>
      )}

      {failing.length > 0 && (
        <div className="repo-group">
          <div className="repo-header sect-fail">Failing</div>
          {failing.map(({ repo, run }) => (
            <FocusRunRow key={run.html_url} repo={repo} run={run} />
          ))}
        </div>
      )}

      {waiting.length > 0 && (
        <div className="repo-group">
          <div className="repo-header sect-wait">Needs approval</div>
          {waiting.map(({ repo, run }) => (
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
          <div className="repo-header sect-label">All quiet</div>
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
                  .slice(0, expandRuns)
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
  const expandedRuns = useExpandedRuns();
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
            <div
              className="run-item tl-row"
              onClick={() => invoke("open_url", { url: run.html_url })}
            >
              <span className="tl-time">{timeLabel(run.created_at)}</span>
              <span
                className={`run-chevron${expandedRuns.includes(run.run_id) ? " open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRunExpanded(run.run_id);
                }}
              >
                ›
              </span>
              <span
                className={`run-dot${run.status !== "completed" ? " dot-pulse" : ""}`}
                style={{
                  backgroundColor:
                    run.status === "waiting"
                      ? "rgb(255, 149, 0)"
                      : run.status !== "completed"
                        ? "rgb(0, 122, 255)"
                        : run.conclusion === "success"
                        ? "rgb(52, 199, 89)"
                        : isBad(run)
                          ? "rgb(255, 59, 48)"
                          : "rgb(142, 142, 147)",
                }}
              />
              <span className="run-name">{run.workflow_name}</span>
              <span
                className="repo-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  openRepoUrl(repo);
                }}
              >
                {chipLabel(repo)}
              </span>
            </div>
            {expandedRuns.includes(run.run_id) && (
              <JobSteps run={run} variant="clean" />
            )}
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
          <button className="repo-header repo-link" onClick={() => openRepoUrl(repo)}>
            {repo}
          </button>
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

const PANES = [
  { id: "repos", label: "Repos" },
  { id: "focus", label: "Focus" },
  { id: "timeline", label: "Timeline" },
  { id: "reviews", label: "Reviews" },
  { id: "prs", label: "My PRs" },
  { id: "comments", label: "Comments" },
] as const;

type Pane = (typeof PANES)[number]["id"];

const PANE_KEY = "ghast-pane";

function loadPane(): number {
  const i = PANES.findIndex((p) => p.id === localStorage.getItem(PANE_KEY));
  return i === -1 ? 0 : i;
}

export default function Menu({
  data,
  focusExpandRuns,
}: {
  data: PanelPayload;
  focusExpandRuns: number;
}) {
  const [paneIdx, setPaneIdx] = useState(loadPane);
  const handleSettings = () => invoke("open_settings");
  const handleQuit = () => invoke("quit_app");

  const goto = (i: number) => {
    setPaneIdx(i);
    localStorage.setItem(PANE_KEY, PANES[i].id);
  };

  const { failing, waiting, running } = bucketRepos(data.repos, data.runs);
  const counts: Record<Pane, number> = {
    repos: 0,
    focus: failing.length + waiting.length + running.length,
    timeline: 0,
    reviews: data.pending_reviews.length,
    prs: data.my_prs.length,
    comments: data.mentions.length,
  };

  const ready = !data.auth_error && data.has_pat;

  return (
    <div className="menu">
      <div className="menu-tabs">
        {PANES.map((p, i) => (
          <button
            key={p.id}
            className={`menu-tab${i === paneIdx ? " active" : ""}`}
            onClick={() => goto(i)}
          >
            {p.label}
            {counts[p.id] > 0 && (
              <span className="menu-tab-badge">{counts[p.id]}</span>
            )}
          </button>
        ))}
      </div>
      <div className="menu-separator" />
      {!ready ? (
        <div className="menu-content">
          {data.auth_error ? (
            <div className="menu-message">Auth error - check Settings</div>
          ) : (
            <div className="menu-message">Open Settings to connect GitHub</div>
          )}
        </div>
      ) : (
        <div className="pager-clip">
          <div
            className="pager-strip"
            style={{ transform: `translateX(-${paneIdx * (100 / PANES.length)}%)` }}
          >
            <div className="pager-page menu-content">
              <ReposView data={data} />
            </div>
            <div className="pager-page menu-content">
              <FocusView data={data} expandRuns={focusExpandRuns} />
            </div>
            <div className="pager-page menu-content">
              <TimelineView data={data} />
            </div>
            <div className="pager-page menu-content">
              {data.pending_reviews.length === 0 ? (
                <div className="menu-message">No pending reviews</div>
              ) : (
                data.pending_reviews.map((r) => (
                  <ReviewItem key={r.html_url} review={r} />
                ))
              )}
            </div>
            <div className="pager-page menu-content">
              {data.my_prs.length === 0 ? (
                <div className="menu-message">No open PRs of yours</div>
              ) : (
                data.my_prs.map((r) => (
                  <ReviewItem key={r.html_url} review={r} />
                ))
              )}
            </div>
            <div className="pager-page menu-content">
              {data.mentions.length === 0 ? (
                <div className="menu-message">No unread mentions</div>
              ) : (
                data.mentions.map((m) => (
                  <MentionItem key={m.html_url} mention={m} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
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
