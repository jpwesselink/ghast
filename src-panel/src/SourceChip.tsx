import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import type { PanelWorkflowRun } from "./types";
import { openExternal, sourceChip } from "./buildViews";

const prTitleCache = new Map<string, string>();

function usePrTitle(repo: string, number: number | null): string {
  const [title, setTitle] = useState(() =>
    number == null ? "" : prTitleCache.get(`${repo}#${number}`) ?? ""
  );

  useEffect(() => {
    if (number == null) return;
    const key = `${repo}#${number}`;
    const hit = prTitleCache.get(key);
    if (hit) {
      setTitle(hit);
      return;
    }
    let alive = true;
    invoke<string>("get_pr_title", { repo, number })
      .then((t) => {
        prTitleCache.set(key, t);
        if (alive) setTitle(t);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [repo, number]);

  return title;
}

/// "#124" (PR, with the PR title on hover) or a branch chip; nothing for
/// default-branch runs.
export default function SourceChip({ run }: { run: PanelWorkflowRun }) {
  const src = sourceChip(run);
  const title = usePrTitle(run.repo, src ? run.pr_number : null);
  if (!src) return null;

  const chip = (
    <span
      className="repo-chip"
      onClick={(e) => {
        e.stopPropagation();
        if (window.getSelection()?.toString()) return;
        openExternal(src.url, run.repo);
      }}
    >
      {src.label}
    </span>
  );

  if (run.pr_number == null) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>
        {title || `${run.repo} #${run.pr_number}`}
      </TooltipContent>
    </Tooltip>
  );
}
