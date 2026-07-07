import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PanelWorkflowRun } from "./types";
import {
  RunJob,
  RunStep,
  duration,
  fetchRunJobs,
  jobIsBad,
  stepUrl,
} from "./runJobs";

export type Variant = "clean" | "blackmetal";

interface Mark {
  glyph: string;
  color: string;
}

type Markable = Pick<RunJob | RunStep, "status" | "conclusion">;

const MARKS: Record<Variant, (s: Markable) => Mark> = {
  clean: (s) => {
    if (s.status !== "completed" && s.status !== "failed")
      return s.status === "in_progress"
        ? { glyph: "◌", color: "rgb(0, 122, 255)" }
        : { glyph: "·", color: "rgb(142, 142, 147)" };
    if (s.conclusion === "success") return { glyph: "✓", color: "rgb(52, 199, 89)" };
    if (jobIsBad(s as RunJob)) return { glyph: "✕", color: "rgb(255, 59, 48)" };
    return { glyph: "–", color: "rgb(142, 142, 147)" };
  },
  blackmetal: (s) => {
    if (s.status !== "completed" && s.status !== "failed")
      return s.status === "in_progress"
        ? { glyph: "◌", color: "#5577ee" }
        : { glyph: "·", color: "#9a8a78" };
    if (s.conclusion === "success") return { glyph: "†", color: "#55aa22" };
    if (jobIsBad(s as RunJob)) return { glyph: "✕", color: "#cc2020" };
    return { glyph: "–", color: "#9a8a78" };
  },
};

const CLS: Record<
  Variant,
  { list: string; job: string; step: string; mark: string; dur: string; note: string }
> = {
  clean: {
    list: "job-list",
    job: "job-row",
    step: "step-row",
    mark: "step-mark",
    dur: "step-duration",
    note: "job-note",
  },
  blackmetal: {
    list: "bm-job-list",
    job: "bm-job-row",
    step: "bm-step-row bm-step-link",
    mark: "bm-step-mark",
    dur: "bm-step-duration",
    note: "bm-job-note",
  },
};

const NOTES: Record<Variant, { loading: string; error: string; empty: string }> = {
  clean: { loading: "fetching jobs...", error: "jobs unavailable", empty: "no jobs reported" },
  blackmetal: {
    loading: "divining the rites...",
    error: "the summoning failed",
    empty: "no rites recorded",
  },
};

/// Total wall-clock of a workflow run; ticks against now while running.
export function WorkflowDuration({
  run,
  className,
}: {
  run: PanelWorkflowRun;
  className: string;
}) {
  return (
    <span className={className}>
      {duration(run.created_at, run.status === "completed" ? run.updated_at : null)}
    </span>
  );
}

/// A run's jobs with all their steps: status mark, name, duration.
/// Jobs open on GitHub; steps deep-link to their log section.
export default function JobSteps({
  run,
  variant,
}: {
  run: PanelWorkflowRun;
  variant: Variant;
}) {
  const [jobs, setJobs] = useState<RunJob[] | null>(null);
  const [error, setError] = useState("");
  const cls = CLS[variant];
  const mark = MARKS[variant];
  const notes = NOTES[variant];

  useEffect(() => {
    let alive = true;
    setError("");
    fetchRunJobs(run.repo, run.run_id, run.status === "completed")
      .then((j) => alive && setJobs(j))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
    // re-fetch while the run is still moving
  }, [run.repo, run.run_id, run.status, run.conclusion, run.created_at]);

  if (error) return <div className={cls.note}>{notes.error}: {error}</div>;
  if (!jobs) return <div className={cls.note}>{notes.loading}</div>;
  if (jobs.length === 0) return <div className={cls.note}>{notes.empty}</div>;

  const nameCls = variant === "clean" ? "run-name" : "bm-run-name";

  return (
    <div className={cls.list}>
      {jobs.map((job) => {
        const jm = mark(job);
        return (
          <div key={job.html_url}>
            <button
              className={cls.job}
              onClick={() => invoke("open_url", { url: job.html_url })}
            >
              <span className={cls.mark} style={{ color: jm.color }}>
                {jm.glyph}
              </span>
              <span className={nameCls}>{job.name}</span>
              <span className={cls.dur}>{duration(job.started_at, job.completed_at)}</span>
            </button>
            {job.steps.map((step) => {
              const sm = mark(step);
              return (
                <button
                  className={cls.step}
                  key={step.number}
                  onClick={() => invoke("open_url", { url: stepUrl(job, step) })}
                >
                  <span className={cls.mark} style={{ color: sm.color }}>
                    {sm.glyph}
                  </span>
                  <span className={nameCls}>{step.name}</span>
                  <span className={cls.dur}>
                    {duration(step.started_at, step.completed_at)}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
