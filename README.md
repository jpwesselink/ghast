<img src="src-tauri/icons/128x128.png" width="80" align="right" />

# ghast

**GitHub Actions Status Tracker**

A macOS menubar app that watches your GitHub Actions workflows and gets out of your way. Click the ghost, see your builds.

![Rust](https://img.shields.io/badge/rust-stable-orange) ![Tauri](https://img.shields.io/badge/tauri-v2-blue) ![macOS](https://img.shields.io/badge/macOS-only-black)

---

## What it does

ghast sits in your menubar as a small ghost icon. It polls GitHub Actions every 30 seconds across all your watched repos and shows a live status panel when you click the icon. When a run finishes, a native macOS notification fires with the result.

The badge next to the ghost tells you at a glance how many runs are currently active.

### Features

- **Custom panel** that drops down from the tray icon, grouped by repo, sorted by most recent activity
- **Status icons** for each workflow run: pentagram for success, inverted cross for failure, all-seeing eye for in-progress
- **Badge count** showing active run count directly on the menubar icon
- **Native notifications** when runs complete, using the ghast icon
- **Click any run** to open it in your browser
- **Settings window** for binding your GitHub PAT and selecting which repos to watch

---

## Getting started

### Prerequisites

- macOS
- Rust (stable)
- Node.js 18+
- A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` and `workflow` scopes

### Run in development

```bash
git clone https://github.com/jpwesselink/ghast.git
cd ghast
cd src-panel && npm install && cd ..
cargo tauri dev
```

### Build a release

```bash
cargo tauri build
```

The `.app` bundle lands in `src-tauri/target/release/bundle/macos/ghast.app`.

### First-time setup

1. Launch ghast. A ghost appears in your menubar.
2. Click the ghost, then **Settings...**
3. Paste your GitHub PAT and click **Bind**
4. Check the repos you want to watch, then click **Unleash**

ghast starts polling immediately.

---

## The hellripper theme

With the panel open, type `hellripper`.

You are now in hellripper mode.

To return to the mortal realm, type `holydiver`.

The theme persists across restarts.

---

## Tech stack

| Layer | Tech |
|---|---|
| App shell | [Tauri v2](https://tauri.app) |
| Backend | Rust, [octocrab](https://github.com/XAMPPRocky/octocrab), tokio |
| Panel UI | React, Vite, TypeScript |
| GitHub API | octocrab |
| Notifications | notify-rust, macOS UNUserNotificationCenter |

## Project structure

```
src-panel/          React frontend (panel + settings)
src-tauri/
  src/
    lib.rs          Tauri setup, Tauri commands
    config.rs       Config persistence (~/.config/ghast/)
    github.rs       GitHub API client
    poller.rs       Background polling loop
    state.rs        Shared app state, workflow run model
    panel.rs        Panel window positioning and lifecycle
    tray.rs         Tray icon, badge, settings window
    notify.rs       Completion detection and notifications
```

## How it works

1. On launch, ghast loads your config (PAT and watched repos) from disk
2. A background Tokio task polls GitHub Actions every 30 seconds
3. After each poll, it diffs the new run states against the previous ones
4. Any run that transitioned from active to completed fires a native notification
5. The panel is a transparent Tauri webview window that positions itself below the tray icon on click
6. Clicking a run in the panel calls the `open_url` command, which opens it in your default browser

## Credits

Hellripper-mode status icons are from [Game Icons](https://game-icons.net) (pentagram, baphomet, all-seeing eye, skull) by their respective authors, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), served via [Iconify](https://iconify.design).

## License

MIT
