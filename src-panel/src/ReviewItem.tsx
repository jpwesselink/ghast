import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelPendingReview } from "./types";

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

// Octicon git-pull-request; GitHub's open-PR green, grey for drafts.
export function PrGlyph({ draft }: { draft: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      style={{ flexShrink: 0, color: draft ? "rgb(142, 142, 147)" : "rgb(63, 185, 80)" }}
      fill="currentColor"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

export default function ReviewItem({ review }: { review: PanelPendingReview }) {
  const handleClick = () => {
    invoke("open_url", { url: review.html_url });
  };

  return (
    <button className="run-item" onClick={handleClick}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span style={{ display: "inline-flex", flexShrink: 0 }}>
            <PrGlyph draft={review.draft} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {`${review.repo} #${review.number} — @${review.author}${review.draft ? " (draft)" : ""}`}
        </TooltipContent>
      </Tooltip>
      <span className="run-name">{review.title}</span>
      <span className="run-time">{formatTimeAgo(review.created_at)}</span>
    </button>
  );
}
