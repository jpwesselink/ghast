import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelMention, PanelPayload, PanelPendingReview, PanelWorkflowRun } from "./types";
import type { PanelTheme } from "./panelTheme";
import JobSteps, { WorkflowDuration } from "./JobSteps";
import SourceChip from "./SourceChip";
import { toggleRunExpanded, useExpandedRuns } from "./runJobs";
import {
  bucketRepos,
  chipLabel,
  dayLabel,
  formatTimeAgo,
  isBad,
  statusLabel,
  timeLabel,
  timelineEntries,
} from "./buildViews";

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

function openRepoUrl(repo: string) {
  // don't hijack a text-selection drag
  if (window.getSelection()?.toString()) return;
  invoke("open_url", { url: `https://github.com/${repo}` });
}

function histClass(prefix: string, run: PanelWorkflowRun): string {
  if (run.status === "waiting") return `${prefix}-wait`;
  if (run.status !== "completed") return `${prefix}-run`;
  if (run.conclusion === "success") return `${prefix}-ok`;
  if (isBad(run)) return `${prefix}-fail`;
  return `${prefix}-skip`;
}

function HistoryStrip({ t, runs }: { t: PanelTheme; runs: PanelWorkflowRun[] }) {
  const last = runs.slice(-5);
  return (
    <span className={t.c.histPrefix}>
      {last.map((r, i) => (
        <i
          key={r.html_url}
          className={`${histClass(t.c.histPrefix, r)}${
            i < last.length - 1 ? ` ${t.c.histPrefix}-dim` : ""
          }`}
        />
      ))}
    </span>
  );
}

function RepoChip({ t, repo }: { t: PanelTheme; repo: string }) {
  return (
    <span
      className={t.c.chip}
      onClick={(e) => {
        e.stopPropagation();
        openRepoUrl(repo);
      }}
    >
      {chipLabel(repo)}
    </span>
  );
}

function ExpandChevron({ t, runId }: { t: PanelTheme; runId: number }) {
  const open = useExpandedRuns().includes(runId);
  return (
    <span
      className={`${t.c.chevron}${open ? " open" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleRunExpanded(runId);
      }}
    >
      ›
    </span>
  );
}

function StatusIconTip({ t, run }: { t: PanelTheme; run: PanelWorkflowRun }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={t.c.iconTrigger}>{t.StatusIcon(run)}</span>
      </TooltipTrigger>
      <TooltipContent variant={t.variant === "blackmetal" ? "blackmetal" : undefined}>
        {statusLabel(run)}
      </TooltipContent>
    </Tooltip>
  );
}

/// One workflow run row; `showRepo` adds the repo chip (focus/timeline).
function RunRow({
  t,
  run,
  showRepo = false,
  showTime = true,
}: {
  t: PanelTheme;
  run: PanelWorkflowRun;
  showRepo?: boolean;
  showTime?: boolean;
}) {
  const expanded = useExpandedRuns().includes(run.run_id);
  return (
    <>
      <div
        className={t.c.row}
        onClick={() => invoke("open_url", { url: run.html_url })}
      >
        <ExpandChevron t={t} runId={run.run_id} />
        <StatusIconTip t={t} run={run} />
        <span className={t.c.name}>{run.workflow_name}</span>
        <SourceChip run={run} variant={t.variant} />
        {showRepo && <RepoChip t={t} repo={run.repo} />}
        <WorkflowDuration run={run} className={t.c.duration} />
        {showTime && (
          <span className={t.c.time}>{formatTimeAgo(run.created_at)}</span>
        )}
      </div>
      {expanded && <JobSteps run={run} variant={t.variant} />}
    </>
  );
}

function CalmGhost({ t, line }: { t: PanelTheme; line: string }) {
  return (
    <div className={t.c.calm}>
      {t.CalmGhost()}
      <div className={t.c.calmLine}>{line}</div>
    </div>
  );
}

function ReposView({ t, data }: { t: PanelTheme; data: PanelPayload }) {
  if (data.repos.length === 0) {
    return <CalmGhost t={t} line={t.copy.noRepos} />;
  }
  return (
    <>
      {data.repos.map((repo) => (
        <div key={repo} className={t.c.group}>
          <button className={t.c.headerLink} onClick={() => openRepoUrl(repo)}>
            {repo}
          </button>
          {data.runs[repo] ? (
            data.runs[repo].map((run) => <RunRow key={run.html_url} t={t} run={run} />)
          ) : (
            <div className={t.c.loading}>{t.copy.loadingRuns}</div>
          )}
        </div>
      ))}
    </>
  );
}

function FocusView({
  t,
  data,
  expandRuns,
}: {
  t: PanelTheme;
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

  const calm = failing.length === 0 && waiting.length === 0 && running.length === 0;

  if (calm && quiet.length === 0) {
    return <CalmGhost t={t} line={t.copy.noRepos} />;
  }

  const section = (cls: string, label: string, items: typeof failing) =>
    items.length > 0 && (
      <div className={t.c.group}>
        <div className={cls}>{label}</div>
        {items.map(({ run }) => (
          <RunRow key={run.html_url} t={t} run={run} showRepo />
        ))}
      </div>
    );

  return (
    <>
      {calm && <CalmGhost t={t} line={t.copy.calm} />}
      {section(t.c.sectFail, t.copy.failing, failing)}
      {section(t.c.sectWait, t.copy.waiting, waiting)}
      {section(t.c.sectRun, t.copy.running, running)}
      {quiet.length > 0 && (
        <div className={t.c.group}>
          <div className={t.c.sectQuiet}>{t.copy.quiet}</div>
          {quiet.map(({ repo, latest, history }) => (
            <div key={repo}>
              <button className={t.c.quietRow} onClick={() => toggle(repo)}>
                <span className={`${t.c.chevron}${expanded.has(repo) ? " open" : ""}`}>
                  ›
                </span>
                <span className={t.c.name}>{repo}</span>
                <HistoryStrip t={t} runs={history} />
                <span className={t.c.time}>{formatTimeAgo(latest.created_at)}</span>
              </button>
              {expanded.has(repo) &&
                [...history]
                  .reverse()
                  .slice(0, expandRuns)
                  .map((run) => <RunRow key={run.html_url} t={t} run={run} />)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TimelineView({ t, data }: { t: PanelTheme; data: PanelPayload }) {
  const entries = timelineEntries(data.runs);
  const expandedRuns = useExpandedRuns();
  if (entries.length === 0) {
    return <CalmGhost t={t} line={t.copy.noRepos} />;
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
            {showDay && <div className={t.c.tlDay}>{day}</div>}
            {showNow && (
              <div className={t.c.tlNow}>
                <span className={t.c.tlNowLabel}>{t.copy.nowLabel}</span>
                <span className={t.c.tlNowLine} />
              </div>
            )}
            <div
              className={t.c.row}
              onClick={() => invoke("open_url", { url: run.html_url })}
            >
              <span className={t.c.tlTime}>{timeLabel(run.created_at)}</span>
              <ExpandChevron t={t} runId={run.run_id} />
              <StatusIconTip t={t} run={run} />
              <span className={t.c.name}>{run.workflow_name}</span>
              <SourceChip run={run} variant={t.variant} />
              <RepoChip t={t} repo={run.repo} />
            </div>
            {expandedRuns.includes(run.run_id) && (
              <JobSteps run={run} variant={t.variant} />
            )}
          </div>
        );
      })}
    </>
  );
}

function ReviewRow({ t, review }: { t: PanelTheme; review: PanelPendingReview }) {
  return (
    <div
      className={t.c.row}
      onClick={() => invoke("open_url", { url: review.html_url })}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={t.c.iconTrigger}>{t.ReviewIcon(review.draft)}</span>
        </TooltipTrigger>
        <TooltipContent variant={t.variant === "blackmetal" ? "blackmetal" : undefined}>
          {`${review.repo} #${review.number} — @${review.author}${review.draft ? " (draft)" : ""}`}
        </TooltipContent>
      </Tooltip>
      <span className={t.c.name}>{review.title}</span>
      <RepoChip t={t} repo={review.repo} />
      <span className={t.c.time}>{formatTimeAgo(review.created_at)}</span>
    </div>
  );
}

function MentionRow({ t, mention }: { t: PanelTheme; mention: PanelMention }) {
  return (
    <div
      className={t.c.row}
      onClick={() => invoke("open_url", { url: mention.html_url })}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={t.c.iconTrigger}>{t.MentionIcon()}</span>
        </TooltipTrigger>
        <TooltipContent variant={t.variant === "blackmetal" ? "blackmetal" : undefined}>
          {`${mention.repo} — ${mention.subject_type}`}
        </TooltipContent>
      </Tooltip>
      <span className={t.c.name}>{mention.title}</span>
      <RepoChip t={t} repo={mention.repo} />
      <span className={t.c.time}>{formatTimeAgo(mention.updated_at)}</span>
    </div>
  );
}

export default function Panel({
  theme: t,
  data,
  focusExpandRuns,
}: {
  theme: PanelTheme;
  data: PanelPayload;
  focusExpandRuns: number;
}) {
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
    reviews: data.pending_reviews.length,
    prs: data.my_prs.length,
    comments: data.mentions.length,
  };

  const ready = !data.auth_error && data.has_pat;

  return (
    <t.Shell>
      <div className={t.c.tabs}>
        {PANES.map((p, i) => (
          <button
            key={p.id}
            className={`${t.c.tab}${i === paneIdx ? " active" : ""}`}
            onClick={() => goto(i)}
          >
            <span>{p.label}</span>
            {counts[p.id] > 0 && <span className={t.c.tabBadge}>{counts[p.id]}</span>}
          </button>
        ))}
      </div>
      {t.SepTop()}
      {!ready ? (
        <div className={t.c.content}>
          <div className={t.c.message}>
            {data.auth_error ? t.copy.authError : t.copy.noPat}
          </div>
        </div>
      ) : (
        <div className={t.c.clip}>
          <div
            className={t.c.strip}
            style={{ transform: `translateX(-${paneIdx * (100 / PANES.length)}%)` }}
          >
            <div className={`${t.c.page} ${t.c.content}`}>
              <ReposView t={t} data={data} />
            </div>
            <div className={`${t.c.page} ${t.c.content}`}>
              <FocusView t={t} data={data} expandRuns={focusExpandRuns} />
            </div>
            <div className={`${t.c.page} ${t.c.content}`}>
              <TimelineView t={t} data={data} />
            </div>
            <div className={`${t.c.page} ${t.c.content}`}>
              {data.pending_reviews.length === 0 ? (
                <div className={t.c.message}>{t.copy.noReviews}</div>
              ) : (
                data.pending_reviews.map((r) => (
                  <ReviewRow key={r.html_url} t={t} review={r} />
                ))
              )}
            </div>
            <div className={`${t.c.page} ${t.c.content}`}>
              {data.my_prs.length === 0 ? (
                <div className={t.c.message}>{t.copy.noPrs}</div>
              ) : (
                data.my_prs.map((r) => <ReviewRow key={r.html_url} t={t} review={r} />)
              )}
            </div>
            <div className={`${t.c.page} ${t.c.content}`}>
              {data.mentions.length === 0 ? (
                <div className={t.c.message}>{t.copy.noMentions}</div>
              ) : (
                data.mentions.map((m) => (
                  <MentionRow key={m.html_url} t={t} mention={m} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {t.SepBottom()}
      <div className={t.c.footer}>
        <button className={t.c.footerItem} onClick={() => invoke("open_about")}>
          About ghast...
        </button>
        <button className={t.c.footerItem} onClick={() => invoke("open_settings")}>
          Settings...
        </button>
        <button className={t.c.footerItem} onClick={() => invoke("quit_app")}>
          Quit ghast
        </button>
      </div>
    </t.Shell>
  );
}
