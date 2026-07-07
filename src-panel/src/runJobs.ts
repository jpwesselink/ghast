import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

export interface RunStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

export interface RunJob {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  steps: RunStep[];
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
