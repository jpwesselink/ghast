import { useEffect, useState } from "react";
import { openExternal } from "./buildViews";
import type { PanelWorkflowRun } from "./types";
import { PANEL_COPY, ThemeId } from "./panelCopy";
import {
  RunJob,
  RunStep,
  duration,
  fetchRunJobs,
  jobIsBad,
  stepUrl,
} from "./runJobs";

type MarkState = "success" | "fail" | "running" | "pending" | "neutral";

function markState(s: Pick<RunJob | RunStep, "status" | "conclusion">): MarkState {
  if (s.status !== "completed" && s.status !== "failed")
    return s.status === "in_progress" ? "running" : "pending";
  if (s.conclusion === "success") return "success";
  if (jobIsBad(s as RunJob)) return "fail";
  return "neutral";
}

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
  themeId,
}: {
  run: PanelWorkflowRun;
  themeId: ThemeId;
}) {
  const copy = PANEL_COPY[themeId];
  const [jobs, setJobs] = useState<RunJob[] | null>(null);
  const [error, setError] = useState("");

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

  if (error) return <div className="job-note">{copy.jobsError}: {error}</div>;
  if (!jobs) return <div className="job-note">{copy.jobsLoading}</div>;
  if (jobs.length === 0) return <div className="job-note">{copy.jobsEmpty}</div>;

  return (
    <div className="job-list">
      {jobs.map((job) => (
        <div key={job.html_url}>
          <button
            className="job-row"
            onClick={() => openExternal(job.html_url, run.repo)}
          >
            <span className="step-mark" data-state={markState(job)} />
            <span className="run-name">{job.name}</span>
            <span className="step-duration">
              {duration(job.started_at, job.completed_at)}
            </span>
          </button>
          {job.steps.map((step) => (
            <button
              className="step-row step-link"
              key={step.number}
              onClick={() => openExternal(stepUrl(job, step), run.repo)}
            >
              <span className="step-mark" data-state={markState(step)} />
              <span className="run-name">{step.name}</span>
              <span className="step-duration">
                {duration(step.started_at, step.completed_at)}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
