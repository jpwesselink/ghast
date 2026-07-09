import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelMention, PanelPayload, PanelPendingReview, PanelWorkflowRun } from "./types";
import { PANEL_COPY, CALM_GHOST, ThemeId } from "./panelCopy";
import { RAIN, SCRATCHES } from "./decor";
import Ghost from "./Ghost";
import JobSteps, { WorkflowDuration } from "./JobSteps";
import SourceChip from "./SourceChip";
import { toggleRunExpanded, useExpandedRuns } from "./runJobs";
import {
  bucketRepos,
  chipLabel,
  openExternal,
  dayLabel,
  formatTimeAgo,
  statusLabel,
  timeLabel,
  timelineEntries,
} from "./buildViews";

const PANES = [
  { id: "repos", label: "Repos" },
  { id: "focus", label: "Focus" },
  { id: "timeline", label: "Timeline" },
  { id: "grid", label: "Grid" },
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

function openRepoUrl(repo: string) {
  // don't hijack a text-selection drag
  if (window.getSelection()?.toString()) return;
  openExternal(`https://github.com/${repo}`, repo);
}

function histClass(run: PanelWorkflowRun): string {
  if (run.status === "waiting") return "hist-wait";
  if (run.status !== "completed") return "hist-run";
  if (run.conclusion === "success") return "hist-ok";
  if (
    run.conclusion === "failure" ||
    run.conclusion === "timed_out" ||
    run.conclusion === "action_required"
  )
    return "hist-fail";
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

function RepoChip({ repo }: { repo: string }) {
  return (
    <span
      className="repo-chip"
      onClick={(e) => {
        e.stopPropagation();
        openRepoUrl(repo);
      }}
    >
      {chipLabel(repo)}
    </span>
  );
}

function ExpandChevron({ runId }: { runId: number }) {
  const open = useExpandedRuns().includes(runId);
  return (
    <span
      className={`run-chevron${open ? " open" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleRunExpanded(runId);
      }}
    >
      ›
    </span>
  );
}

/// Status is rendered as an attribute-addressed span; each theme's CSS
/// decides whether that means a colored dot or a summoned glyph.
function StatusIconTip({ run }: { run: PanelWorkflowRun }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="icon-trigger">
          <span
            className="status-icon"
            data-status={run.status}
            data-conclusion={run.conclusion ?? ""}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{statusLabel(run)}</TooltipContent>
    </Tooltip>
  );
}

function RunRow({
  themeId,
  run,
  showRepo = false,
  showTime = true,
}: {
  themeId: ThemeId;
  run: PanelWorkflowRun;
  showRepo?: boolean;
  showTime?: boolean;
}) {
  const expanded = useExpandedRuns().includes(run.run_id);
  return (
    <>
      <div className="run-item" onClick={() => openExternal(run.html_url, run.repo)}>
        <ExpandChevron runId={run.run_id} />
        <StatusIconTip run={run} />
        <span className="run-name">{run.workflow_name}</span>
        <SourceChip run={run} />
        {showRepo && <RepoChip repo={run.repo} />}
        <WorkflowDuration run={run} className="run-duration" />
        {showTime && <span className="run-time">{formatTimeAgo(run.created_at)}</span>}
      </div>
      {expanded && <JobSteps run={run} themeId={themeId} />}
    </>
  );
}

function CalmGhost({ themeId, line }: { themeId: ThemeId; line: string }) {
  return (
    <div className="calm-ghost">
      <Ghost size={56} {...CALM_GHOST[themeId]} />
      <div className="calm-line">{line}</div>
    </div>
  );
}

function ReposView({ themeId, data }: { themeId: ThemeId; data: PanelPayload }) {
  const copy = PANEL_COPY[themeId];
  if (data.repos.length === 0) {
    return <CalmGhost themeId={themeId} line={copy.noRepos} />;
  }
  return (
    <>
      {data.repos.map((repo) => (
        <div key={repo} className="repo-group">
          <button className="repo-header repo-link" onClick={() => openRepoUrl(repo)}>
            {repo}
          </button>
          {data.runs[repo] ? (
            data.runs[repo].map((run) => (
              <RunRow key={run.html_url} themeId={themeId} run={run} />
            ))
          ) : (
            <div className="run-loading">{copy.loadingRuns}</div>
          )}
        </div>
      ))}
    </>
  );
}

function FocusView({
  themeId,
  data,
  expandRuns,
}: {
  themeId: ThemeId;
  data: PanelPayload;
  expandRuns: number;
}) {
  const copy = PANEL_COPY[themeId];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { failing, waiting, running, quiet } = bucketRepos(data.repos, data.runs);

  const toggle = (repo: string) => {
    const next = new Set(expanded);
    if (next.has(repo)) next.delete(repo);
    else next.add(repo);
    setExpanded(next);
  };

  const calm = failing.length === 0 && waiting.length === 0 && running.length === 0;

  if (calm && quiet.length === 0) {
    return <CalmGhost themeId={themeId} line={copy.noRepos} />;
  }

  const section = (cls: string, label: string, items: typeof failing) =>
    items.length > 0 && (
      <div className="repo-group">
        <div className={`repo-header ${cls}`}>{label}</div>
        {items.map(({ run }) => (
          <RunRow key={run.html_url} themeId={themeId} run={run} showRepo />
        ))}
      </div>
    );

  return (
    <>
      {calm && <CalmGhost themeId={themeId} line={copy.calm} />}
      {section("sect-fail", copy.failing, failing)}
      {section("sect-wait", copy.waiting, waiting)}
      {section("sect-run", copy.running, running)}
      {quiet.length > 0 && (
        <div className="repo-group">
          <div className="repo-header sect-quiet">{copy.quiet}</div>
          {quiet.map(({ repo, latest, history }) => (
            <div key={repo}>
              <button className="run-item quiet-row" onClick={() => toggle(repo)}>
                <span className={`run-chevron${expanded.has(repo) ? " open" : ""}`}>
                  ›
                </span>
                <span className="run-name">{repo}</span>
                <HistoryStrip runs={history} />
                <span className="run-time">{formatTimeAgo(latest.created_at)}</span>
              </button>
              {expanded.has(repo) &&
                [...history]
                  .reverse()
                  .slice(0, expandRuns)
                  .map((run) => (
                    <RunRow key={run.html_url} themeId={themeId} run={run} />
                  ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TimelineView({ themeId, data }: { themeId: ThemeId; data: PanelPayload }) {
  const copy = PANEL_COPY[themeId];
  const entries = timelineEntries(data.runs);
  const expandedRuns = useExpandedRuns();
  if (entries.length === 0) {
    return <CalmGhost themeId={themeId} line={copy.noRepos} />;
  }

  let lastDay = "";
  const hasActive = entries.some(({ run }) => run.status !== "completed");

  return (
    <>
      {entries.map(({ run }, i) => {
        const day = dayLabel(run.created_at);
        const showDay = day !== lastDay;
        lastDay = day;
        const showNow = hasActive && i === 0;
        return (
          <div key={run.html_url}>
            {showDay && <div className="repo-header tl-day">{day}</div>}
            {showNow && (
              <div className="tl-now">
                <span className="tl-now-label">{copy.nowLabel}</span>
                <span className="tl-now-line" />
              </div>
            )}
            <div
              className="run-item tl-row"
              onClick={() => openExternal(run.html_url, run.repo)}
            >
              <span className="tl-time">{timeLabel(run.created_at)}</span>
              <ExpandChevron runId={run.run_id} />
              <StatusIconTip run={run} />
              <span className="run-name">{run.workflow_name}</span>
              <SourceChip run={run} />
              <RepoChip repo={run.repo} />
            </div>
            {expandedRuns.includes(run.run_id) && (
              <JobSteps run={run} themeId={themeId} />
            )}
          </div>
        );
      })}
    </>
  );
}

type RepoState = "fail" | "wait" | "run" | "ok" | "idle";

/// Worst state among each workflow's latest run; ranked bad-first.
function repoState(runs: PanelWorkflowRun[] | undefined): RepoState {
  if (!runs || runs.length === 0) return "idle";
  let state: RepoState = "idle";
  const rank: Record<RepoState, number> = { fail: 4, wait: 3, run: 2, ok: 1, idle: 0 };
  const latest = new Map<string, PanelWorkflowRun>();
  for (const r of runs) {
    const prev = latest.get(r.workflow_name);
    if (!prev || r.created_at > prev.created_at) latest.set(r.workflow_name, r);
  }
  for (const r of latest.values()) {
    let s: RepoState = "idle";
    if (r.status === "waiting") s = "wait";
    else if (r.status !== "completed") s = "run";
    else if (
      r.conclusion === "failure" ||
      r.conclusion === "timed_out" ||
      r.conclusion === "action_required"
    )
      s = "fail";
    else if (r.conclusion === "success") s = "ok";
    if (rank[s] > rank[state]) state = s;
  }
  return state;
}

function GridView({ themeId, data }: { themeId: ThemeId; data: PanelPayload }) {
  const copy = PANEL_COPY[themeId];
  if (data.repos.length === 0) {
    return <CalmGhost themeId={themeId} line={copy.noRepos} />;
  }
  return (
    <div className="repo-grid">
      {data.repos.map((repo) => (
        <button
          key={repo}
          className="repo-cell"
          data-state={repoState(data.runs[repo])}
          title={repo}
          onClick={() => openRepoUrl(repo)}
        >
          {chipLabel(repo)}
        </button>
      ))}
    </div>
  );
}

function ReviewRow({ review }: { review: PanelPendingReview }) {
  return (
    <div
      className="run-item"
      onClick={() => openExternal(review.html_url, review.repo)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="icon-trigger">
            <span className="pr-icon" data-draft={review.draft ? "true" : "false"} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {`${review.repo} #${review.number} — @${review.author}${review.draft ? " (draft)" : ""}`}
        </TooltipContent>
      </Tooltip>
      <span className="run-name">{review.title}</span>
      <RepoChip repo={review.repo} />
      <span className="run-time">{formatTimeAgo(review.created_at)}</span>
    </div>
  );
}

function MentionRow({ mention }: { mention: PanelMention }) {
  return (
    <div
      className="run-item"
      onClick={() => openExternal(mention.html_url, mention.repo)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="icon-trigger">
            <span className="comment-icon" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{`${mention.repo} — ${mention.subject_type}`}</TooltipContent>
      </Tooltip>
      <span className="run-name">{mention.title}</span>
      <RepoChip repo={mention.repo} />
      <span className="run-time">{formatTimeAgo(mention.updated_at)}</span>
    </div>
  );
}

export default function Panel({
  themeId,
  data,
  focusExpandRuns,
}: {
  themeId: ThemeId;
  data: PanelPayload;
  focusExpandRuns: number;
}) {
  const copy = PANEL_COPY[themeId];
  const [paneIdx, setPaneIdx] = useState(loadPane);

  const goto = (i: number) => {
    setPaneIdx(i);
    localStorage.setItem(PANE_KEY, PANES[i].id);
  };

  const { failing, waiting, running } = bucketRepos(data.repos, data.runs);
  const counts: Record<Pane, number> = {
    repos: 0,
    focus: failing.length + waiting.length + running.length,
    timeline: 0,
    grid: 0,
    reviews: data.pending_reviews.length,
    prs: data.my_prs.length,
    comments: data.mentions.length,
  };

  const ready = !data.auth_error && data.has_pat;

  return (
    <div className="menu">
      <div className="decor-noise" />
      <div className="decor-scratches">
        {SCRATCHES.map((d, i) => (
          <div
            key={i}
            className="decor-scratch"
            style={{
              width: d.w,
              height: d.h,
              left: `${d.left}%`,
              top: `${d.top}%`,
              transform: `rotate(${d.rot}deg)`,
              opacity: d.o,
            }}
          />
        ))}
      </div>

      <div className="panel-inner">
        <div className="decor-rain">
          {RAIN.map((d, i) => (
            <div
              key={i}
              className="decor-drop"
              style={{
                left: `${d.left}%`,
                width: d.w,
                height: d.h,
                opacity: d.o,
                animationDelay: `${d.delay}s`,
                animationDuration: `${d.dur}s`,
              }}
            />
          ))}
        </div>
        <div className="brand-title">
          <span className="brand-text">
            Ghast
            <span className="brand-drip" />
            <span className="brand-drip" />
            <span className="brand-drip" />
          </span>
        </div>
        <div className="brand-subtitle">{copy.subtitle}</div>

        <div className="menu-tabs">
          {PANES.map((p, i) => (
            <button
              key={p.id}
              className={`menu-tab${i === paneIdx ? " active" : ""}`}
              onClick={() => goto(i)}
            >
              <span>{p.label}</span>
              {counts[p.id] > 0 && <span className="menu-tab-badge">{counts[p.id]}</span>}
            </button>
          ))}
        </div>
        <div className="menu-separator sep-top" />
        {!ready ? (
          <div className="menu-content">
            <div className="menu-message">
              {data.auth_error ? copy.authError : copy.noPat}
            </div>
          </div>
        ) : (
          <div className="pager-clip">
            <div
              className="pager-strip"
              style={{ transform: `translateX(-${paneIdx * (100 / PANES.length)}%)` }}
            >
              <div className="pager-page menu-content">
                <ReposView themeId={themeId} data={data} />
              </div>
              <div className="pager-page menu-content">
                <FocusView themeId={themeId} data={data} expandRuns={focusExpandRuns} />
              </div>
              <div className="pager-page menu-content">
                <TimelineView themeId={themeId} data={data} />
              </div>
              <div className="pager-page menu-content">
                <GridView themeId={themeId} data={data} />
              </div>
              <div className="pager-page menu-content">
                {data.pending_reviews.length === 0 ? (
                  <div className="menu-message">{copy.noReviews}</div>
                ) : (
                  data.pending_reviews.map((r) => <ReviewRow key={r.html_url} review={r} />)
                )}
              </div>
              <div className="pager-page menu-content">
                {data.my_prs.length === 0 ? (
                  <div className="menu-message">{copy.noPrs}</div>
                ) : (
                  data.my_prs.map((r) => <ReviewRow key={r.html_url} review={r} />)
                )}
              </div>
              <div className="pager-page menu-content">
                {data.mentions.length === 0 ? (
                  <div className="menu-message">{copy.noMentions}</div>
                ) : (
                  data.mentions.map((m) => <MentionRow key={m.html_url} mention={m} />)
                )}
              </div>
            </div>
          </div>
        )}
        <div className="menu-separator sep-bottom" />
        <div className="menu-footer">
          <button className="footer-item" onClick={() => invoke("open_about")}>
            About ghast...
          </button>
          <button className="footer-item" onClick={() => invoke("open_settings")}>
            Settings...
          </button>
          <button className="footer-item" onClick={() => invoke("quit_app")}>
            Quit ghast
          </button>
        </div>
        <div className="footer-sigil">
          <span className="footer-sigil-mark" />
        </div>
      </div>
    </div>
  );
}
