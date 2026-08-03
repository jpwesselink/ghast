import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

export interface RunStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface RunJob {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
  steps: RunStep[];
}

/// "1h 4m", "4m 12s", "12s"; still-running entries measure against now.
export function duration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return "";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - start) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/// GitHub job page anchor that scrolls to a step's log section.
export function stepUrl(job: RunJob, step: RunStep): string {
  return `${job.html_url}#step:${step.number}:1`;
}

const jobCache = new Map<number, RunJob[]>();

export async function fetchRunJobs(
  repo: string,
  runId: number,
  completed: boolean
): Promise<RunJob[]> {
  if (completed) {
    const hit = jobCache.get(runId);
    if (hit) return hit;
  }
  const jobs = await invoke<RunJob[]>("get_run_jobs", { repo, runId });
  if (completed) jobCache.set(runId, jobs);
  return jobs;
}

export function jobIsBad(j: RunJob | RunStep): boolean {
  return (
    j.conclusion === "failure" ||
    j.conclusion === "timed_out" ||
    j.conclusion === "action_required"
  );
}

/// Global set of expanded runs, capped: expanding a sixth run collapses
/// the oldest expansion.
const MAX_EXPANDED = 5;
let expanded: number[] = [];
const listeners = new Set<() => void>();

export function toggleRunExpanded(runId: number) {
  expanded = expanded.includes(runId)
    ? expanded.filter((i) => i !== runId)
    : [...expanded, runId].slice(-MAX_EXPANDED);
  listeners.forEach((l) => l());
}

export function useExpandedRuns(): number[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => expanded
  );
}
