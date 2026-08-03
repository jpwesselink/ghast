# Design: Mention notifications + About-screen eye tracking

Date: 2026-07-07
Status: approved

## Feature 1: @-mention notifications

Notify the user when they are @-mentioned in comments on repos they select, and list recent mentions in the panel.

### Scope selection

- New `mention_repos: Vec<String>` in `config.rs`, serde-defaulted (same pattern as `review_repos`).
- Settings window gets a third checkbox column "Mentions" next to "Workflows" and "Reviews", in both themes (`Settings.tsx`, `BlackMetalSettings.tsx`).
- New Tauri command `set_mention_repos` mirroring `set_review_repos`, including the first-poll baseline reset to avoid spurious notifications.

### Detection: GitHub Notifications API

- `github.rs`: `get_mentions(repos: &[String]) -> Result<Vec<Mention>, String>` using the authenticated `GET /notifications` endpoint (octocrab activity API).
- Keep threads where `reason == "mention"` and the repo full name is in `mention_repos`.
- `Mention` fields: `repo`, `title`, `subject_type` (Issue / PullRequest / Commit), `html_url`, `updated_at`.
- The notification thread subject URL is an API URL. Convert to a browser URL by rewriting `api.github.com/repos/...` patterns (issues/pulls/commits). No extra API call.
- Threads are never marked read; the user's GitHub notification state is untouched.
- Works with the existing `repo`-scoped classic PAT (repo scope includes notifications access).

### Polling and notifications

- `poller.rs` polls mentions each tick alongside runs and reviews.
- New mention = thread whose `updated_at` is newer than the previous poll baseline. `first_mention_poll` flag suppresses notifications on the first poll after startup or repo-list change (same trick as reviews).
- Native notification: title "New mention in {owner/repo}", body = subject title. Clicking a panel row opens the mention in the browser.
- Menubar badge count is NOT changed: it stays runs + pending reviews.

### Panel UI

- New "Mentions" section under "Pending reviews" in both themes (`Menu.tsx`, `BlackMetal.tsx`). Hellripper title: "Whispers of the damned".
- Row component `MentionItem.tsx` (pattern of `ReviewItem.tsx`): subject title, repo, age, click opens `html_url` via existing `open_url` command.
- Section hidden when empty, same as reviews.
- `types.ts` and the `PanelData` payload in `lib.rs` gain `mentions: Vec<Mention>`.

## Feature 2: About-screen eyes follow mouse

- Implemented inside the shared `Ghost` component in `About.tsx`, so Clean and Hellripper themes both get it.
- `mousemove` listener on `window` computes, per eye, the vector from eye center (derived from the SVG's `getBoundingClientRect`) to the cursor.
- Pupil (black ellipse) and milk highlight shift along that vector, clamped to 2.5 viewBox units so they stay inside the eye outline.
- CSS transition (~80ms) for easing; on `mouseleave` of the document the eyes return to center.
- Tracking is window-local only. No native global-cursor polling.

## Testing

- `cargo test`: config round-trip with `mention_repos` (present and missing key), API-URL to web-URL rewrite cases (issue, PR, commit), new-mention baseline logic if factored testably.
- `npx tsc --noEmit` clean.
- Manual: tick Mentions column, get mentioned, notification fires once and row appears; eyes track in both themes.

## Out of scope

- Counting mentions in the badge.
- Marking GitHub notification threads read.
- Global (outside-window) cursor tracking.
