export interface PanelWorkflowRun {
  run_id: number;
  repo: string;
  branch: string;
  on_default_branch: boolean;
  pr_number: number | null;
  workflow_name: string;
  status: "queued" | "waiting" | "in_progress" | "completed";
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface PanelPendingReview {
  repo: string;
  number: number;
  title: string;
  author: string;
  html_url: string;
  created_at: string;
  draft: boolean;
}

export interface PanelMention {
  repo: string;
  title: string;
  subject_type: string;
  html_url: string;
  updated_at: string;
  unread: boolean;
}

export interface PanelPayload {
  repos: string[];
  runs: Record<string, PanelWorkflowRun[]>;
  pending_reviews: PanelPendingReview[];
  my_prs: PanelPendingReview[];
  mentions: PanelMention[];
  auth_error: boolean;
  has_pat: boolean;
  badge_count: number;
}
