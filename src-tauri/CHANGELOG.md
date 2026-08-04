# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0](https://github.com/jpwesselink/ghast/releases/tag/v0.2.0) - 2026-08-04

### Added

- *(mentions)* deep-link comment anchors and keep read mentions visible
- reuse one browser tab per repo when opening links
- *(panel)* PR title tooltip on source chips; chips in focus rows
- *(panel)* PR or branch source chip on run rows
- *(panel)* My PRs section across all selected repos
- *(panel)* first-class waiting-for-approval run state
- *(panel)* workflow total duration; extract shared JobSteps component
- *(panel)* step deep-links and job/step durations
- *(panel)* expandable run rows with jobs and steps
- *(reviews)* PR glyph with GitHub semantics; segmented view switch; fix pane split
- *(tray)* failing state is the ghost with red eyes, not a red ghost
- *(tray)* per-kind glyph counts and red ghost on failing builds
- *(settings)* configurable builds fetched per repo (1-10)
- *(panel)* persist user panel size; fix hellripper size labels
- deep-link mentions to the latest comment anchor
- *(settings)* macOS-style sidebar settings, font scale, focus expand count, loading indicators
- *(panel)* keep panel centered under tray icon during resize
- track @-mentions via notifications API, mentions settings column and panel section
- track PRs awaiting my review ([#5](https://github.com/jpwesselink/ghast/pull/5))
- keychain PAT, radix tooltips, inline glyphs, theme sync, ghost about page ([#3](https://github.com/jpwesselink/ghast/pull/3))
- ghast - GitHub Actions Status Tracker

### Fixed

- *(reviews)* drop merged and closed PRs the search index still returns
- *(panel)* align run duration column; default-branch fallback for source chips
- *(panel)* minimum window sizes for panel and settings
- *(theme)* read real system accent from AppKit instead of CSS AccentColor

### Other

- bump version to 0.2.0
- release v0.1.0 ([#1](https://github.com/jpwesselink/ghast/pull/1))
- *(poller)* log poll failures with real GitHub error detail
- *(poller)* parallel repo fetches, early panel update, poll on open
- release workflow, native rounded corners fix

## [0.1.0](https://github.com/jpwesselink/ghast/releases/tag/v0.1.0) - 2026-08-03

### Added

- *(mentions)* deep-link comment anchors and keep read mentions visible
- reuse one browser tab per repo when opening links
- *(panel)* PR title tooltip on source chips; chips in focus rows
- *(panel)* PR or branch source chip on run rows
- *(panel)* My PRs section across all selected repos
- *(panel)* first-class waiting-for-approval run state
- *(panel)* workflow total duration; extract shared JobSteps component
- *(panel)* step deep-links and job/step durations
- *(panel)* expandable run rows with jobs and steps
- *(reviews)* PR glyph with GitHub semantics; segmented view switch; fix pane split
- *(tray)* failing state is the ghost with red eyes, not a red ghost
- *(tray)* per-kind glyph counts and red ghost on failing builds
- *(settings)* configurable builds fetched per repo (1-10)
- *(panel)* persist user panel size; fix hellripper size labels
- deep-link mentions to the latest comment anchor
- *(settings)* macOS-style sidebar settings, font scale, focus expand count, loading indicators
- *(panel)* keep panel centered under tray icon during resize
- track @-mentions via notifications API, mentions settings column and panel section
- track PRs awaiting my review ([#5](https://github.com/jpwesselink/ghast/pull/5))
- keychain PAT, radix tooltips, inline glyphs, theme sync, ghost about page ([#3](https://github.com/jpwesselink/ghast/pull/3))
- ghast - GitHub Actions Status Tracker

### Fixed

- *(reviews)* drop merged and closed PRs the search index still returns
- *(panel)* align run duration column; default-branch fallback for source chips
- *(panel)* minimum window sizes for panel and settings
- *(theme)* read real system accent from AppKit instead of CSS AccentColor

### Other

- *(poller)* log poll failures with real GitHub error detail
- *(poller)* parallel repo fetches, early panel update, poll on open
- release workflow, native rounded corners fix
