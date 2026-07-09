import type { PanelWorkflowRun } from "./types";

const BAD_CONCLUSIONS = new Set(["failure", "timed_out", "action_required"]);

export function isBad(run: PanelWorkflowRun): boolean {
  return run.status === "completed" && BAD_CONCLUSIONS.has(run.conclusion ?? "");
}

export function isActive(run: PanelWorkflowRun): boolean {
  return run.status === "queued" || run.status === "in_progress";
}

/// Latest run per workflow name, so an old red run doesn't flag a repo
/// whose workflow has since gone green.
export function latestPerWorkflow(runs: PanelWorkflowRun[]): PanelWorkflowRun[] {
  const latest = new Map<string, PanelWorkflowRun>();
  for (const r of runs) {
    const prev = latest.get(r.workflow_name);
    if (!prev || r.created_at > prev.created_at) latest.set(r.workflow_name, r);
  }
  return [...latest.values()];
}

export interface RepoRun {
  repo: string;
  run: PanelWorkflowRun;
}

export interface QuietRepo {
  repo: string;
  latest: PanelWorkflowRun;
  /// oldest -> newest, for the history strip
  history: PanelWorkflowRun[];
}

export interface RepoBuckets {
  failing: RepoRun[];
  waiting: RepoRun[];
  running: RepoRun[];
  quiet: QuietRepo[];
}

export function bucketRepos(
  repos: string[],
  runsByRepo: Record<string, PanelWorkflowRun[]>
): RepoBuckets {
  const failing: RepoRun[] = [];
  const waiting: RepoRun[] = [];
  const running: RepoRun[] = [];
  const quiet: QuietRepo[] = [];

  for (const repo of repos) {
    const runs = runsByRepo[repo];
    if (!runs || runs.length === 0) continue;

    let calm = true;
    for (const run of latestPerWorkflow(runs)) {
      if (run.status === "waiting") {
        waiting.push({ repo, run });
        calm = false;
      } else if (isActive(run)) {
        running.push({ repo, run });
        calm = false;
      } else if (isBad(run)) {
        failing.push({ repo, run });
        calm = false;
      }
    }

    if (calm) {
      const history = [...runs].sort((a, b) => a.created_at.localeCompare(b.created_at));
      quiet.push({ repo, latest: history[history.length - 1], history });
    }
  }

  const newestFirst = (a: RepoRun, b: RepoRun) =>
    b.run.created_at.localeCompare(a.run.created_at);
  failing.sort(newestFirst);
  waiting.sort(newestFirst);
  running.sort(newestFirst);
  quiet.sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at));

  return { failing, waiting, running, quiet };
}

export function timelineEntries(
  runsByRepo: Record<string, PanelWorkflowRun[]>
): RepoRun[] {
  return Object.entries(runsByRepo)
    .flatMap(([repo, runs]) => runs.map((run) => ({ repo, run })))
    .sort((a, b) => b.run.created_at.localeCompare(a.run.created_at));
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/// Chip label for a repo: short name, and when too long, drop leading
/// dash-segments so the distinctive tail stays visible ("…video-workflow"
/// instead of "pathe-home…").
export function chipLabel(repo: string, max = 15): string {
  const name = repo.split("/")[1] ?? repo;
  if (name.length <= max) return name;
  const segs = name.split("-");
  while (segs.length > 1 && segs.join("-").length > max - 1) {
    segs.shift();
  }
  let tail = segs.join("-");
  if (tail.length > max - 1) tail = tail.slice(-(max - 1));
  return `…${tail}`;
}

/// Where a run came from: its PR when GitHub links one, else its branch
/// when not the default branch.
export function sourceChip(
  run: PanelWorkflowRun
): { label: string; url: string } | null {
  if (run.pr_number != null)
    return {
      label: `#${run.pr_number}`,
      url: `https://github.com/${run.repo}/pull/${run.pr_number}`,
    };
  if (!run.on_default_branch && run.branch) {
    const label =
      run.branch.length > 15 ? `…${run.branch.slice(-14)}` : run.branch;
    return {
      label,
      url: `https://github.com/${run.repo}/tree/${run.branch}`,
    };
  }
  return null;
}

export function formatTimeAgo(iso: string): string {
  const diffS = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffS < 60) return "just now";
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export function statusLabel(run: PanelWorkflowRun): string {
  if (run.status === "in_progress") return "Running";
  if (run.status === "queued") return "Queued";
  if (run.status === "waiting") return "Waiting for approval";
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
