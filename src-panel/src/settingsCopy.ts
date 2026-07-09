import type { ThemeId } from "./panelCopy";
import type { Section } from "./SettingsPanel";

export interface SettingsCopy {
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
}

export const SETTINGS_COPY: Record<ThemeId, SettingsCopy> = {
  phosphor: {
    nav: {
      account: "auth",
      repositories: "repos",
      appearance: "display",
      general: "config",
    },
    titles: {
      account: "auth",
      repositories: "repos",
      appearance: "display",
      general: "config",
    },
    tokenPlaceholder: "ghp_...",
    connect: "bind",
    connecting: "binding",
    connected: "token bound",
    connectedAs: (login) => `bound :: ${login}`,
    failed: (e) => `error :: ${e}`,
    searchPlaceholder: "grep...",
    emptyUnbound: "bind a token under auth first",
    emptyNone: "no repositories found",
    noMatches: "no matches",
    loadingRepos: "scanning remotes...",
    privateBadge: "priv",
    fontSizeLabel: "font size",
    fontSizeHint: "scales panel text",
    fontSizes: [
      { label: "80", value: 0.9 },
      { label: "100", value: 1.0 },
      { label: "115", value: 1.15 },
      { label: "130", value: 1.3 },
    ],
    perRepoLabel: "runs per repo",
    perRepoHint: "recent runs fetched and shown per repo",
    expandLabel: "runs per idle repo",
    expandHint: "runs shown when expanding an idle repo in focus",
    colRepository: "repository",
    colWorkflows: "workflows",
    colReviews: "reviews",
    colMentions: "mentions",
  },
  holydiver: {
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
  hellripper: {
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
};
