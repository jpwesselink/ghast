import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelWorkflowRun } from "./types";
import {
  RunJob,
  fetchRunJobs,
  jobIsBad,
  toggleRunExpanded,
  useExpandedRuns,
} from "./runJobs";

function formatTimeAgo(iso: string): string {
  const dt = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const diffS = Math.floor(diffMs / 1000);

  if (diffS < 60) return "just now";
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

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

function dotColor(run: PanelWorkflowRun): string {
  switch (run.status) {
    case "queued":
      return "rgb(255, 204, 0)";
    case "in_progress":
      return "rgb(0, 122, 255)";
    case "completed":
      switch (run.conclusion) {
        case "success":
          return "rgb(52, 199, 89)";
        case "failure":
          return "rgb(255, 59, 48)";
        default:
          return "rgb(142, 142, 147)";
      }
    default:
      return "rgb(142, 142, 147)";
  }
}

function stepMark(s: { status: string; conclusion: string | null }): {
  glyph: string;
  color: string;
} {
  if (s.status !== "completed" && s.status !== "failed")
    return s.status === "in_progress"
      ? { glyph: "◌", color: "rgb(0, 122, 255)" }
      : { glyph: "·", color: "rgb(142, 142, 147)" };
  if (s.conclusion === "success") return { glyph: "✓", color: "rgb(52, 199, 89)" };
  if (jobIsBad(s as RunJob)) return { glyph: "✕", color: "rgb(255, 59, 48)" };
  return { glyph: "–", color: "rgb(142, 142, 147)" };
}

function JobList({ run }: { run: PanelWorkflowRun }) {
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

  if (error) return <div className="job-note">jobs unavailable: {error}</div>;
  if (!jobs) return <div className="job-note">fetching jobs...</div>;
  if (jobs.length === 0) return <div className="job-note">no jobs reported</div>;

  return (
    <div className="job-list">
      {jobs.map((job) => {
        const mark = stepMark(job);
        return (
          <div key={job.html_url}>
            <button
              className="job-row"
              onClick={() => invoke("open_url", { url: job.html_url })}
            >
              <span className="step-mark" style={{ color: mark.color }}>
                {mark.glyph}
              </span>
              <span className="run-name">{job.name}</span>
            </button>
            {job.steps.map((step) => {
              const sm = stepMark(step);
              return (
                <div className="step-row" key={step.number}>
                  <span className="step-mark" style={{ color: sm.color }}>
                    {sm.glyph}
                  </span>
                  <span className="run-name">{step.name}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function RunItem({ run }: { run: PanelWorkflowRun }) {
  const expanded = useExpandedRuns().includes(run.run_id);

  const handleClick = () => {
    invoke("open_url", { url: run.html_url });
  };

  return (
    <>
      <button className="run-item" onClick={handleClick}>
        <span
          className={`run-chevron${expanded ? " open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleRunExpanded(run.run_id);
          }}
        >
          ›
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="run-dot" style={{ backgroundColor: dotColor(run) }} />
          </TooltipTrigger>
          <TooltipContent>{statusLabel(run)}</TooltipContent>
        </Tooltip>
        <span className="run-name">{run.workflow_name}</span>
        <span className="run-time">{formatTimeAgo(run.created_at)}</span>
      </button>
      {expanded && <JobList run={run} />}
    </>
  );
}
