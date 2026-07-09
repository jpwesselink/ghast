import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export type Section = "account" | "repositories" | "appearance" | "general";

/// Everything a settings theme provides: class map, copy, spinner,
/// optional decorations, and feature flags (theme cards are the
/// hellripper exit door; holydiver keeps the easter egg hidden).
export interface SettingsTheme {
  variant: "clean" | "blackmetal";
  c: {
    shell: string;
    sidebar: string;
    navItem: string;
    pane: string;
    paneTitle: string;
    group: string;
    row: string;
    rowLabel: string;
    rowHint: string;
    input: string;
    btn: string;
    status: string;
    statusError: string;
    seg: string;
    colHeaders: string;
    colSpacer: string;
    colH: string;
    repoItem: string;
    repoName: string;
    repoCol: string;
    checkbox: string;
    badge: string;
    empty: string;
    loadingRow: string;
    themeCards: string;
    themeCard: string;
    themeThumbHoly: string;
    themeThumbHell: string;
    themeName: string;
    eyeToggle: string;
  };
  copy: {
    nav: Record<Section, string>;
    titles: Record<Section, string>;
    tokenPlaceholder: string;
    connect: string;
    connecting: string;
    connected: string;
    connectedAs: (login: string) => string;
    failed: (e: unknown) => string;
    searchPlaceholder: string;
    emptyUnbound: string;
    emptyNone: string;
    noMatches: string;
    loadingRepos: string;
    privateBadge: string;
    fontSizeLabel: string;
    fontSizeHint: string;
    fontSizes: { label: string; value: number }[];
    perRepoLabel: string;
    perRepoHint: string;
    expandLabel: string;
    expandHint: string;
    colRepository: string;
    colWorkflows: string;
    colReviews: string;
    colMentions: string;
  };
  Spinner: () => ReactNode;
  Shell: (props: { children: ReactNode; flicker: boolean }) => ReactNode;
  SidebarHeader: () => ReactNode;
  showThemeCards: boolean;
  tokenReveal: boolean;
}

function CleanSpinner() {
  return <span className="s-spinner" />;
}

export const cleanSettingsTheme: SettingsTheme = {
  variant: "clean",
  c: {
    shell: "s-shell",
    sidebar: "s-sidebar",
    navItem: "s-nav-item",
    pane: "s-pane",
    paneTitle: "s-pane-title",
    group: "s-group",
    row: "s-row",
    rowLabel: "s-row-label",
    rowHint: "s-row-hint",
    input: "s-input",
    btn: "s-btn",
    status: "s-status",
    statusError: "s-status error",
    seg: "s-seg",
    colHeaders: "s-col-headers",
    colSpacer: "s-col-spacer",
    colH: "s-col-h",
    repoItem: "s-repo-item",
    repoName: "s-repo-name",
    repoCol: "s-repo-col",
    checkbox: "s-checkbox",
    badge: "s-badge",
    empty: "s-empty",
    loadingRow: "s-loading-row",
    themeCards: "s-theme-cards",
    themeCard: "s-theme-card",
    themeThumbHoly: "s-theme-thumb holy",
    themeThumbHell: "s-theme-thumb hell",
    themeName: "s-theme-name",
    eyeToggle: "s-eye-toggle",
  },
  copy: {
    nav: {
      account: "Account",
      repositories: "Repositories",
      appearance: "Appearance",
      general: "General",
    },
    titles: {
      account: "Account",
      repositories: "Repositories",
      appearance: "Appearance",
      general: "General",
    },
    tokenPlaceholder: "GitHub token (ghp_...)",
    connect: "Connect",
    connecting: "Connecting",
    connected: "Connected",
    connectedAs: (login) => `Connected as ${login}`,
    failed: (e) => `Failed: ${e}`,
    searchPlaceholder: "Search...",
    emptyUnbound: "Connect your GitHub token under Account first",
    emptyNone: "No repositories found",
    noMatches: "No matches",
    loadingRepos: "Fetching repositories...",
    privateBadge: "private",
    fontSizeLabel: "Font size",
    fontSizeHint: "Scales text in the menubar panel",
    fontSizes: [
      { label: "Small", value: 0.9 },
      { label: "Default", value: 1.0 },
      { label: "Large", value: 1.15 },
      { label: "Huge", value: 1.3 },
    ],
    perRepoLabel: "Builds per repo",
    perRepoHint: "How many recent runs to fetch and show per repo in the Repos view",
    expandLabel: "Runs per quiet repo",
    expandHint:
      'How many runs show when expanding a repo under "All quiet" in Focus view',
    colRepository: "Repository",
    colWorkflows: "Workflows",
    colReviews: "Reviews",
    colMentions: "Mentions",
  },
  Spinner: CleanSpinner,
  Shell: ({ children }) => <div className="s-shell">{children}</div>,
  SidebarHeader: () => null,
  showThemeCards: false,
  tokenReveal: false,
};

function NoiseCanvas({ opacity = 0.06 }: { opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = 300;
    c.height = 300;
    const img = ctx.createImageData(300, 300);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        pointerEvents: "none",
        zIndex: 9999,
        mixBlendMode: "overlay",
      }}
    />
  );
}

function Pentagram({ size = 15, color = "#cc2020" }: { size?: number; color?: string }) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${50 + 45 * Math.cos(angle)},${50 + 45 * Math.sin(angle)}`);
  }
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="bms-sigil-spin"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <polygon points={pts.join(" ")} fill="none" stroke={color} strokeWidth="3" />
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export const blackmetalSettingsTheme: SettingsTheme = {
  variant: "blackmetal",
  c: {
    shell: "bms-shell",
    sidebar: "bms-sidebar",
    navItem: "bms-nav-item",
    pane: "bms-pane",
    paneTitle: "bms-pane-title",
    group: "bms-group",
    row: "bms-row",
    rowLabel: "bms-row-label",
    rowHint: "bms-row-hint",
    input: "bms-input",
    btn: "bms-btn",
    status: "bms-status",
    statusError: "bms-status error",
    seg: "bms-seg",
    colHeaders: "bms-col-headers",
    colSpacer: "bms-col-spacer",
    colH: "bms-col-h",
    repoItem: "bms-repo-item",
    repoName: "bms-repo-name",
    repoCol: "bms-repo-col",
    checkbox: "bms-checkbox",
    badge: "bms-badge",
    empty: "bms-empty",
    loadingRow: "bms-loading-row",
    themeCards: "bms-theme-cards",
    themeCard: "bms-theme-card",
    themeThumbHoly: "bms-theme-thumb holy",
    themeThumbHell: "bms-theme-thumb hell",
    themeName: "bms-theme-name",
    eyeToggle: "bms-eye-toggle",
  },
  copy: {
    nav: {
      account: "Soul Binding",
      repositories: "Haunted Repos",
      appearance: "Vestments",
      general: "Rites",
    },
    titles: {
      account: "Soul Binding",
      repositories: "Haunted Repositories",
      appearance: "Vestments",
      general: "Rites",
    },
    tokenPlaceholder: "ghp_...",
    connect: "Bind",
    connecting: "Binding",
    connected: "Soul bound",
    connectedAs: (login) => `Bound to ${login}`,
    failed: (e) => `The ritual failed: ${e}`,
    searchPlaceholder: "search the catacombs...",
    emptyUnbound: "Bind your soul first, under Soul Binding",
    emptyNone: "The void holds no repositories",
    noMatches: "No souls found",
    loadingRepos: "Summoning repositories from the void...",
    privateBadge: "private",
    fontSizeLabel: "Script size",
    fontSizeHint: "How large the inscriptions appear in the panel",
    fontSizes: [
      { label: "Meek", value: 0.9 },
      { label: "Mortal", value: 1.0 },
      { label: "Demonic", value: 1.15 },
      { label: "Monstrous", value: 1.3 },
    ],
    perRepoLabel: "Souls per haunting",
    perRepoHint: "Recent runs summoned per repository in the Repos view",
    expandLabel: "Corpses per crypt",
    expandHint: "Runs revealed when a resting repo is disturbed in Focus view",
    colRepository: "Repository",
    colWorkflows: "Workflows",
    colReviews: "Reviews",
    colMentions: "Mentions",
  },
  Spinner: () => <Pentagram />,
  Shell: ({ children, flicker }) => (
    <div className={`bms-shell ${flicker ? "screen-flicker" : ""}`}>
      <NoiseCanvas opacity={0.06} />
      {children}
    </div>
  ),
  SidebarHeader: () => <div className="bms-side-title">Ghast</div>,
  showThemeCards: true,
  tokenReveal: true,
};
