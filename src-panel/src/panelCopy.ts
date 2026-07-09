export type ThemeId = "holydiver" | "hellripper";

export interface PanelCopy {
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
  jobsLoading: string;
  jobsError: string;
  jobsEmpty: string;
}

export const PANEL_COPY: Record<ThemeId, PanelCopy> = {
  holydiver: {
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
    jobsLoading: "fetching jobs...",
    jobsError: "jobs unavailable",
    jobsEmpty: "no jobs reported",
  },
  hellripper: {
    authError: "The binding has failed... check Settings",
    noPat: "No soul has been bound... open Settings",
    noRepos: "No repositories have been haunted",
    loadingRuns: "summoning...",
    noReviews: "No souls awaiting judgment",
    noPrs: "No offerings of thine own",
    noMentions: "The whispers have fallen silent",
    calm: "All souls at rest",
    failing: "The damned",
    waiting: "Awaiting the seal",
    running: "Rituals in progress",
    quiet: "At rest",
    nowLabel: "the witching hour",
    jobsLoading: "divining the rites...",
    jobsError: "the summoning failed",
    jobsEmpty: "no rites recorded",
  },
};

export const CALM_GHOST: Record<
  ThemeId,
  {
    bodyColor?: string;
    bodyOpacity?: number;
    eyeMilkColor: string;
    eyeMilkScale: number;
    glow?: string;
  }
> = {
  holydiver: {
    bodyColor: "var(--ghost-body)",
    eyeMilkColor: "#ffffff",
    eyeMilkScale: 0.8,
  },
  hellripper: {
    bodyOpacity: 0.85,
    eyeMilkColor: "#e6e0d2",
    eyeMilkScale: 1.1,
    glow: "#aa1010",
  },
};
