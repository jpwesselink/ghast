export interface PanelWorkflowRun {
  repo: string;
  workflow_name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

export interface PanelPayload {
  repos: string[];
  runs: Record<string, PanelWorkflowRun[]>;
  auth_error: boolean;
  has_pat: boolean;
  badge_count: number;
}
