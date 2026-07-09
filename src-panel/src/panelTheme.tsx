import type { ReactNode } from "react";
import type { PanelWorkflowRun } from "./types";
import Ghost from "./Ghost";

/// Everything a panel theme provides: class names for each semantic slot,
/// copy strings, status iconography, and the outer shell (decorations).
export interface PanelTheme {
  variant: "clean" | "blackmetal";
  c: {
    tabs: string;
    tab: string;
    tabBadge: string;
    content: string;
    clip: string;
    strip: string;
    page: string;
    message: string;
    group: string;
    header: string;
    headerLink: string;
    sectFail: string;
    sectWait: string;
    sectRun: string;
    sectQuiet: string;
    row: string;
    quietRow: string;
    chevron: string;
    name: string;
    time: string;
    chip: string;
    duration: string;
    histPrefix: string;
    calm: string;
    calmLine: string;
    footer: string;
    footerItem: string;
    tlTime: string;
    tlNow: string;
    tlNowLabel: string;
    tlNowLine: string;
    tlDay: string;
    iconTrigger: string;
    loading: string;
  };
  copy: {
    authError: string;
    noPat: string;
    noRepos: string;
    loadingRuns: string;
    noReviews: string;
    noPrs: string;
    noMentions: string;
    calm: string;
    failing: string;
    waiting: string;
    running: string;
    quiet: string;
    nowLabel: string;
  };
  CalmGhost: () => ReactNode;
  StatusIcon: (run: PanelWorkflowRun) => ReactNode;
  ReviewIcon: (draft: boolean) => ReactNode;
  MentionIcon: () => ReactNode;
  Shell: (props: { children: ReactNode }) => ReactNode;
  SepTop: () => ReactNode;
  SepBottom: () => ReactNode;
}

function dotColor(run: PanelWorkflowRun): string {
  switch (run.status) {
    case "queued":
      return "rgb(255, 204, 0)";
    case "waiting":
      return "rgb(255, 149, 0)";
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

// Octicon git-pull-request; GitHub's open-PR green, grey for drafts.
export function PrGlyph({ draft, color }: { draft: boolean; color?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      style={{
        flexShrink: 0,
        color: color ?? (draft ? "rgb(142, 142, 147)" : "rgb(63, 185, 80)"),
      }}
      fill="currentColor"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

// Octicon comment, in the mention blue.
export function CommentGlyph({ color = "rgb(70, 150, 220)" }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      style={{ flexShrink: 0, color }}
      fill="currentColor"
    >
      <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  );
}

export const cleanTheme: PanelTheme = {
  variant: "clean",
  c: {
    tabs: "menu-tabs",
    tab: "menu-tab",
    tabBadge: "menu-tab-badge",
    content: "menu-content",
    clip: "pager-clip",
    strip: "pager-strip",
    page: "pager-page",
    message: "menu-message",
    group: "repo-group",
    header: "repo-header",
    headerLink: "repo-header repo-link",
    sectFail: "repo-header sect-fail",
    sectWait: "repo-header sect-wait",
    sectRun: "repo-header sect-run",
    sectQuiet: "repo-header sect-label",
    row: "run-item",
    quietRow: "run-item quiet-row",
    chevron: "run-chevron",
    name: "run-name",
    time: "run-time",
    chip: "repo-chip",
    duration: "run-duration",
    histPrefix: "hist",
    calm: "calm-ghost",
    calmLine: "calm-line",
    footer: "menu-footer",
    footerItem: "footer-item",
    tlTime: "tl-time",
    tlNow: "tl-now",
    tlNowLabel: "tl-now-label",
    tlNowLine: "tl-now-line",
    tlDay: "repo-header tl-day",
    iconTrigger: "icon-trigger",
    loading: "run-loading",
  },
  copy: {
    authError: "Auth error - check Settings",
    noPat: "Open Settings to connect GitHub",
    noRepos: "No repos watched - check Settings",
    loadingRuns: "loading...",
    noReviews: "No pending reviews",
    noPrs: "No open PRs of yours",
    noMentions: "No unread mentions",
    calm: "Nothing haunts you",
    failing: "Failing",
    waiting: "Needs approval",
    running: "Running",
    quiet: "All quiet",
    nowLabel: "now",
  },
  CalmGhost: () => (
    <Ghost
      size={56}
      bodyColor="var(--ghost-body)"
      eyeMilkColor="#ffffff"
      eyeMilkScale={0.8}
    />
  ),
  StatusIcon: (run) => (
    <span
      className={`run-dot${run.status !== "completed" ? " dot-pulse" : ""}`}
      style={{ backgroundColor: dotColor(run) }}
    />
  ),
  ReviewIcon: (draft) => <PrGlyph draft={draft} />,
  MentionIcon: () => <CommentGlyph />,
  Shell: ({ children }) => <div className="menu">{children}</div>,
  SepTop: () => <div className="menu-separator" />,
  SepBottom: () => <div className="menu-separator" />,
};
