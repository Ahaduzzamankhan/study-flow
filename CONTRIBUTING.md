# Contributing to StudyFlow

Thanks for taking the time to improve StudyFlow. This is a desktop application
with a strict local-first contract, so a few rules matter more than usual.

## Getting set up

```bash
npm ci
npm run icons      # regenerate PNG/ICO assets from build/icon.svg
npm run dev        # renderer at http://localhost:5173 (development bridge)
npm start          # build and launch the real Electron app
```

`npm run dev` serves the renderer with a development bridge backed by
`localStorage`, which is convenient for UI work. Anything that touches files,
dialogs or the SQLite database only behaves fully inside Electron — verify those
flows with `npm start`.

## Before opening a pull request

```bash
npm run typecheck   # renderer + main process
npm test            # unit tests for timer, stats, database, IPC and export
npm run build       # production renderer and main-process bundles
```

All three must pass. Add tests for new calculations rather than new UI snapshots.

## Ground rules

- **Local-first.** No accounts, no telemetry, no network calls except the opt-in
  update check. Do not add analytics or cloud sync.
- **Real functionality only.** No placeholder buttons, fabricated data or TODO
  comments for essential behaviour.
- **Security.** Renderer code must stay sandboxed: no `nodeIntegration`, no direct
  filesystem access, and every new IPC capability needs a Zod schema in
  `shared/contract.ts` plus a handler in `electron/ipc/handlers.ts`.
- **Migrations are append-only.** Never edit a released migration; add a new one
  with the next version number.
- **Design.** Keep the pastel, rounded, cartoon-inspired identity. Check contrast
  (4.5:1 for body text), keyboard focus states and `prefers-reduced-motion`.

## Commit messages

Use Conventional Commits, for example `feat(timer): persist paused state` or
`fix(analytics): stop counting breaks in daily averages`.

## Reporting bugs

Open an issue with your Windows version, StudyFlow version (Settings → About),
the steps you took and what you expected to happen. Logs from
`%APPDATA%\StudyFlow` help; never attach personal study data without reviewing it
first.
