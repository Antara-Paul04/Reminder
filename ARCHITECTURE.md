# Architecture

Three Electron processes, one typed contract between them.

```
src/
├── shared/                  # The only code visible to all processes
│   ├── types.ts             # Domain models (Project, Note, Spec, TimelineEvent, AgentInfo…)
│   └── ipc.ts               # IpcContract — every channel + request/response types
│
├── main/                    # Node side: storage, files, (future) agents
│   ├── index.ts             # App lifecycle: scheme → db → ipc → window
│   ├── window.ts            # BrowserWindow (hiddenInset title bar, dark bg)
│   ├── media.ts             # media:// protocol + file library in userData/library/
│   ├── db/                  # better-sqlite3: one repository module per table
│   │   ├── index.ts         # Connection + user_version migrations
│   │   ├── schema.ts        # Ordered migration list
│   │   └── projects|notes|specs|inspiration|screenshots|qa|timeline.ts
│   ├── ipc/                 # One registrar per domain; registry.ts = typed handle()
│   └── agents/roster.ts     # Static agent roster (Phase 2 replaces with adapters)
│
├── preload/index.ts         # ~20 lines: whitelist channels, expose window.api.invoke
│
└── renderer/src/
    ├── lib/                 # api.ts (typed IPC facade), files, format, cn()
    ├── stores/              # Zustand: projects, ui (tabs/panels/palette), timeline
    ├── hooks/               # useShortcuts, useProjectData (per-project loader)
    ├── components/
    │   ├── ui/              # shadcn-style primitives (button, dialog, command…)
    │   ├── layout/          # TitleBar, Sidebar, Workspace, WelcomeScreen
    │   └── command/         # Command palette
    └── features/            # One folder per panel
        ├── projects/        # Item row + create/rename/delete dialogs
        ├── inspiration/     # Drag-and-drop gallery (images + URLs)
        ├── notes/  spec/    # Both built on features/docs/DocListEditor
        ├── docs/            # Shared master–detail autosaving editor
        ├── session/         # Claude session panel (Phase 2 chrome, live roster)
        ├── screenshots/     # Screenshot history grid
        ├── qa/              # QA feedback list with severity + resolve
        └── timeline/        # Activity rail, grouped by day
```

## Key decisions

**One IPC contract.** `shared/ipc.ts` defines every channel with its request and
response types. Main implements it (`ipc/registry.ts` enforces the types),
preload whitelists it, and `lib/api.ts` gives the renderer a typed facade.
Adding a capability = one entry in the contract + one handler + one facade line.

**SQLite stays in main.** Repositories are plain functions over better-sqlite3
(synchronous, transactional). The renderer never sees SQL. Migrations are an
append-only list gated by `user_version`.

**Files live in userData/library/**, served to the renderer through a custom
`media://` protocol (path-traversal guarded) so `webSecurity` stays on. Uploads
travel as `ArrayBuffer` over IPC — no reliance on file paths from the DOM.

**The timeline is the audit log.** Every mutating IPC handler logs a
`TimelineEvent` with an `actor` field. Today the actor is `you`; in Phase 2
agents write to the same log, so the activity rail becomes the orchestration
trace for free.

**Panels are dumb, stores are thin.** Each panel loads its own collection via
`useProjectData` and calls the api facade directly; global state is only what
crosses panels (active project, tab, palette, timeline).

## Phase 2 seams

- `main/agents/` grows an `AgentAdapter` interface (spawn/stream/cancel) with a
  Claude Code adapter (child process) and API-backed adapters. The roster
  already carries `provider` and `status`.
- Streaming events go main → renderer over a push channel (`webContents.send`),
  the inverse of today's invoke contract, feeding the Session panel transcript.
- Agent outputs are already modeled: specs (`author` field), screenshots,
  QA items, timeline events — agents simply write to the same repositories.
