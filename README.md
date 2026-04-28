<img src="src-tauri/icons/128x128.png" width="80" align="right" />

# ghast

**The ghost that haunts your CI.**

A macOS menubar app that watches your GitHub Actions workflows, nudges you when builds finish, and stays out of your way the rest of the time.

![Rust](https://img.shields.io/badge/rust-stable-orange) ![Tauri](https://img.shields.io/badge/tauri-v2-blue) ![macOS](https://img.shields.io/badge/macOS-only-black) ![haunted by](https://img.shields.io/badge/haunted%20by-GitHub%20Actions-purple) ![theme](https://img.shields.io/badge/theme-cursed-red)

---

## What it does

Click the ghost in your menubar. A panel drops down showing your workflow runs grouped by repo, sorted by most recent activity. Green dot means it passed. Red dot means it didn't. Click any run to open it in your browser. When a run finishes, a native macOS notification tells you the result. A badge on the icon shows how many runs are currently active.

### Features

- **Custom panel** that drops down from the tray icon, grouped by repo
- **Badge count** showing active runs on the menubar icon
- **Native notifications** when workflow runs complete
- **Click any run** to jump straight to it on GitHub
- **Settings window** for binding your GitHub PAT and picking repos to watch

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

### Download a release

Grab the `.dmg` from [Releases](https://github.com/jpwesselink/ghast/releases), open it, drag ghast to Applications. On first launch, macOS may block it because it's not signed yet. If so, run this once:

```bash
xattr -cr /Applications/ghast.app
```

### Build from source

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

## The other realm

With the panel open, type `hellripper` to enter the other realm. Pentagrams. Baphomet. Blood rain. Gothic blackletter. Candlelight glow.

To return to humanity, type `holydiver`.

The theme persists across restarts. You have been warned.

---

## Tech stack

| Layer | Tech |
|---|---|
| App shell | [Tauri v2](https://tauri.app) |
| Backend | Rust, [octocrab](https://github.com/XAMPPRocky/octocrab), tokio |
| Panel UI | React, Vite, TypeScript |
| Notifications | notify-rust |

## Project structure

```
src-panel/          React frontend (panel + settings + about)
src-tauri/
  src/
    lib.rs          Tauri setup, commands
    config.rs       Config persistence
    github.rs       GitHub API client
    poller.rs       Background polling loop
    state.rs        Shared app state
    panel.rs        Panel window positioning
    tray.rs         Tray icon, badge, settings
    notify.rs       Completion detection, notifications
```

## Credits

Hellripper-mode status icons are from [Game Icons](https://game-icons.net) by their respective authors, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), served via [Iconify](https://iconify.design).

## License

MIT. Use it. Fork it. Haunt your own builds.
