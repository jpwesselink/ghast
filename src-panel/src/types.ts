export interface PanelWorkflowRun {
  repo: string;
  workflow_name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

export interface PanelPendingReview {
  repo: string;
  number: number;
  title: string;
  author: string;
  html_url: string;
  created_at: string;
}

export interface PanelMention {
  repo: string;
  title: string;
  subject_type: string;
  html_url: string;
  updated_at: string;
}

export interface PanelPayload {
  repos: string[];
  runs: Record<string, PanelWorkflowRun[]>;
  pending_reviews: PanelPendingReview[];
  mentions: PanelMention[];
  auth_error: boolean;
  has_pat: boolean;
  badge_count: number;
}
