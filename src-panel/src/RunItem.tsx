import { invoke } from "@tauri-apps/api/core";
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
      <span className="run-dot" style={{ backgroundColor: dotColor(run) }} />
      <span className="run-name">{run.workflow_name}</span>
      <span className="run-time">{formatTimeAgo(run.created_at)}</span>
    </button>
  );
}
