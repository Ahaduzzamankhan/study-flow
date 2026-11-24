# Changelog

All notable changes to StudyFlow are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-11-24

First stable release.

### Added

- **Dashboard** with today's study time, session count, streaks, goal completion,
  weekly totals, completed tasks, a GitHub-style activity heatmap, subject
  distribution, recent sessions, upcoming tasks, today's schedule, active goals,
  achievement highlights and a daily quote. Widgets can be reordered or hidden.
- **Pomodoro timer** with timestamp-derived countdown, pause/resume/reset/skip,
  configurable focus, short-break and long-break durations, long-break interval,
  auto-start options, three presets, circular progress, per-session subject and
  task selection, full-screen focus mode, and crash/minimise/sleep recovery from
  a persisted timer state.
- **Session tracking** with automatic timer sessions and manual entries, edit,
  delete, search, subject/type/range filters, daily grouping and duplicate
  protection.
- **Subjects and chapters** with colour and icon customisation, study targets,
  chapter completion tracking, weekly/monthly totals and cascade deletes.
- **Tasks and planner** with priority, due dates, estimates, status filters,
  weekly study blocks and deadline overview.
- **Goals** for daily, weekly and monthly minutes, per-subject minutes, session
  counts and chapter counts, measured from focus time only.
- **Habit tracker** with daily completion toggles, 7-day and 30-day views,
  streaks and rolling completion rate.
- **Achievements and levelling** with nine milestones, XP and level progression,
  unlock toasts and native notifications.
- **Notes** with Markdown editing and preview, subject association, pinning,
  search and debounced autosave.
- **Analytics** with daily/weekly/monthly averages, longest session, most studied
  subject, most productive day, completion rate, focus-versus-break totals,
  best weekday, subject comparison and CSV/JSON export.
- **Settings** for theme (light, dark, system), six accent palettes, motion
  preferences, tray behaviour, launch at startup, timer configuration, sound and
  desktop notifications, database backup/restore and data clearing.
- **Electron shell** with context isolation, a validated IPC channel contract,
  restricted navigation, native menu, system tray, single-instance lock and
  Windows notifications.
- **SQLite persistence** via better-sqlite3 with versioned migrations, foreign
  keys, indexes, WAL journaling and transactional writes.
- **Release engineering**: Electron Builder Windows packaging, a genuine Inno
  Setup installer script, checksums, portable ZIP and a GitHub Actions release
  workflow triggered by `v*` tags.
