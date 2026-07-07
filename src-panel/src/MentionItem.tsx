import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelMention } from "./types";

function formatTimeAgo(iso: string): string {
  const dt = new Date(iso);
  const diffS = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (diffS < 60) return "just now";
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function MentionItem({ mention }: { mention: PanelMention }) {
  const handleClick = () => {
    invoke("open_url", { url: mention.html_url });
  };

  return (
    <button className="run-item" onClick={handleClick}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="run-dot mention-dot" />
        </TooltipTrigger>
        <TooltipContent>
          {`${mention.repo} — ${mention.subject_type}`}
        </TooltipContent>
      </Tooltip>
      <span className="run-name">{mention.title}</span>
      <span className="run-time">{formatTimeAgo(mention.updated_at)}</span>
    </button>
  );
}
