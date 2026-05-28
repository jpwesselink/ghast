import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelWorkflowRun } from "./types";

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

export default function RunItem({ run }: { run: PanelWorkflowRun }) {
  const handleClick = () => {
    invoke("open_url", { url: run.html_url });
  };

  return (
    <button className="run-item" onClick={handleClick}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="run-dot" style={{ backgroundColor: dotColor(run) }} />
        </TooltipTrigger>
        <TooltipContent>{statusLabel(run)}</TooltipContent>
      </Tooltip>
      <span className="run-name">{run.workflow_name}</span>
      <span className="run-time">{formatTimeAgo(run.created_at)}</span>
    </button>
  );
}
