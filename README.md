# AI Studio

An orchestration platform for AI-assisted creative work — **not a chatbot**. AI
Studio manages the workflow between multiple AI specialists building premium
Framer templates: a **Creative Director** (turns briefs and inspiration into
specs), an **Engineer** (Claude Code, implements the spec), and a **Design QA**
(reviews output and files feedback). You provide inspiration images, website
URLs, notes, and a short design brief; the platform coordinates the rest.

This repository contains **Phase 1**: a production-quality desktop application
shell with no AI orchestration yet, architected so Phase 2 (live agents) drops
in cleanly. The design language aims at Linear / Raycast / Notion / Cursor —
dark-first, minimal, generous spacing, subtle animation, no skeuomorphism.

> **History note:** this repo previously held a macOS reminders app. It was
> scrapped and rebuilt from scratch as AI Studio; the old code is recoverable at
> commit `86713c8`.

---

## What was built in Phase 1

**Interface (all nine areas from the brief):**

1. **Project sidebar** — create, rename, delete, switch; agent roster pinned to
   the bottom (shown as "soon" until Phase 2)
2. **Main workspace** — per-project tab bar: Inspiration · Notes · Spec ·
   Session · Screenshots · QA
3. **Activity timeline** — right rail, events grouped by day with per-type
   icons; every mutation in the app logs an event with an `actor` field
4. **Inspiration gallery** — drag-and-drop image uploads anywhere in the panel,
   plus website-URL reference cards
5. **Notes panel** — master–detail list + editor with debounced autosave
6. **Prompt/spec viewer** — same editor pattern, monospace body, author badge
   (`Authored by you` today; agent names in Phase 2)
7. **Claude session panel** — full session chrome (agent chips, transcript
   area, message bar) rendered but dormant until Phase 2
8. **Screenshot history** — grid of build previews with timestamps,
   drag-and-drop or manual upload
9. **QA feedback panel** — file feedback with low/medium/high severity,
   resolve/reopen, delete

**Platform features:**

- **Command palette** (⌘K, cmdk) — actions, panel navigation, project search
- **Global keyboard shortcuts** (table below)
- **Resizable panes** (react-resizable-panels) with layout persisted across
  launches
- **Welcome screen** with recent projects when nothing is open
- **Persistent storage** — SQLite database plus a managed file library in
  `~/Library/Application Support/AI Studio/`
- **Native feel** — hidden-inset title bar with drag region, dark window
  background, external links open in the system browser

## Stack

| Layer | Choice |
| --- | --- |
| Desktop runtime | Electron (via electron-vite: main / preload / renderer) |
| UI | React 18 + TypeScript (strict everywhere) |
| Build | Vite |
| Styling | Tailwind CSS 3, dark-first CSS variables |
| Components | Hand-rolled shadcn/ui-style primitives (Radix + cva + tailwind-merge) |
| State | Zustand (projects, UI, timeline) |
| Database | better-sqlite3 in the main process only |
| Palette / panes | cmdk, react-resizable-panels |

## Getting started

```bash
npm install
npm run dev        # launch the app with HMR
```

Other scripts:

```bash
npm run typecheck  # strict TS over main, preload, and renderer
npm run build      # production bundles into out/
npm run rebuild    # rebuild better-sqlite3 against Electron's Node headers
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| ⌘K | Command palette |
| ⌘N | New project |
| ⌘B | Toggle sidebar |
| ⌘J | Toggle activity timeline |
| ⌘1–6 | Switch workspace panels |
| ⌘↵ | Submit QA feedback (from the feedback box) |

## How it's put together

The full module map lives in [ARCHITECTURE.md](ARCHITECTURE.md). The short
version:

- **One typed IPC contract** ([src/shared/ipc.ts](src/shared/ipc.ts)) defines
  every channel with request/response types. Main implements it through a typed
  `handle()` registry, the preload whitelists channels and exposes a single
  `window.api.invoke`, and the renderer consumes a typed facade
  ([src/renderer/src/lib/api.ts](src/renderer/src/lib/api.ts)). Adding a
  capability is one contract entry + one handler + one facade line.
- **SQLite stays in main.** One repository module per table, append-only
  migrations gated by `user_version`. The renderer never sees SQL.
- **Files live in a managed library** under `userData/library/`, served to the
  renderer through a custom `media://` protocol (path-traversal guarded) so
  Chromium's `webSecurity` stays on. Uploads cross IPC as `ArrayBuffer`s.
- **The timeline is the audit log.** Every mutating handler logs an event with
  an actor. In Phase 2, agents write to the same log — the activity rail
  becomes the orchestration trace for free.
- **No file over ~400 lines.** Features live in their own folders; shared
  pieces (e.g. the notes/spec master–detail editor) are factored out.

## Phase 2 (not built yet, seams in place)

- `src/main/agents/` grows an `AgentAdapter` interface (spawn / stream /
  cancel): a Claude Code adapter as a child process, API-backed adapters for
  the Creative Director and Design QA. The static roster already carries
  `provider` and `status`.
- Streaming transcripts flow main → renderer over a push channel
  (`webContents.send`) into the existing Session panel.
- Agent outputs are already modeled: specs carry an `author`, screenshots and
  QA items have repositories, timeline events have actors — agents simply
  write to the same tables.

## Troubleshooting

**`Error: Electron uninstall` on `npm run dev`** — the Electron binary didn't
install correctly. Usually `node node_modules/electron/install.js` fixes it. If
the extracted `Electron.app` is incomplete (missing `Contents/Frameworks`),
extract the cached zip manually:

```bash
cd node_modules/electron && rm -rf dist && mkdir dist && cd dist
ditto -x -k ~/Library/Caches/electron/*/electron-v*-darwin-arm64.zip .
printf "Electron.app/Contents/MacOS/Electron" > ../path.txt
```

**Native module errors mentioning `NODE_MODULE_VERSION`** — better-sqlite3 was
compiled against the wrong Node ABI; run `npm run rebuild`.
