# Architecture

Three Electron processes, one typed contract between them — and at the center,
a provider-agnostic **Agent Runtime** (`src/core/`) that owns all orchestration.

```
src/
├── core/                    # ★ The Agent Runtime — pure TS, no electron/db/UI imports
│   ├── runtime/
│   │   ├── types.ts         # Roles, statuses, stages, AgentEvent, RuntimeEvent, Artifact
│   │   ├── Agent.ts         # THE provider contract: execute(ctx) → AsyncGenerator<AgentEvent>
│   │   ├── Mission.ts       # Mission model, snapshots, stage helpers
│   │   ├── EventBus.ts      # Typed pub/sub — everything communicates through events
│   │   ├── MissionRunner.ts # Sequential pipeline executor: run/pause/resume/cancel/retry
│   │   └── AgentRuntime.ts  # Facade: agent registry + active missions + the bus
│   └── agents/
│       ├── SimulatedAgent.ts        # Base: timed script → paced AsyncGenerator
│       └── simulated/               # Creative Director, Engineer, Design QA + previews
│
├── shared/                  # The only code visible to all processes
│   ├── types.ts             # Domain models + runtime wire-type re-exports
│   └── ipc.ts               # IpcContract — every channel + push channel + types
│
├── main/                    # Node side: storage, files, runtime host
│   ├── index.ts             # App lifecycle: scheme → db → runtime → ipc → window
│   ├── window.ts            # BrowserWindow (hiddenInset title bar, dark bg)
│   ├── media.ts             # media:// protocol + file library in userData/library/
│   ├── runtime/             # Runtime host — the ONLY place runtime meets storage/UI
│   │   ├── index.ts         # Boot: register providers (simulated today)
│   │   ├── context.ts       # Project brief + notes + inspiration → MissionInput
│   │   └── bridge.ts        # Bus → renderer push + persistence (missions, artifacts,
│   │                        #   timeline, specs, screenshots, QA items)
│   ├── db/                  # better-sqlite3: one repository module per table
│   │   ├── index.ts         # Connection + user_version migrations
│   │   ├── schema.ts        # Ordered migration list
│   │   └── projects|notes|specs|inspiration|screenshots|qa|timeline|missions|artifacts.ts
│   └── ipc/                 # One registrar per domain; registry.ts = typed handle()
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
        ├── session/         # Live mission control: transcript, progress, controls
        ├── screenshots/     # Screenshot history grid (agents add previews)
        ├── qa/              # QA feedback list with severity + resolve
        └── timeline/        # Activity rail, grouped by day
```

## The Agent Runtime

`src/core/` is the operating system the providers install into. It is pure
TypeScript with zero imports from electron, the database, or the renderer —
the same code runs headless in tests.

**Provider contract.** Every agent implements `Agent` — identity plus
`execute(context): AsyncGenerator<AgentEvent>`. Agents receive a
`MissionContext` (brief, notes, references, upstream **artifacts**, attempt
number, AbortSignal) and stream `status` / `message` / `progress` /
`artifact` / `stage` / `verdict` events. The renderer cannot tell a simulator
from Claude Code; only `provider: string` differs.

**Artifacts, not conversations.** Agents never talk to each other. Each
yields artifacts (creative-spec.md, implementation-plan.md,
hero-component.tsx, build-log.txt, qa-feedback.md, preview SVGs); the
MissionRunner accumulates them on the mission and hands the full set to every
downstream agent via its context.

**MissionRunner.** Executes the pipeline (Creative → Engineer → QA)
sequentially, translating each agent's stream into bus events. Pause works
via an await-gate between events (generator state is preserved); cancel via
AbortSignal; retry re-runs from the recorded failed step with an incremented
attempt counter. A rejected QA verdict marks the *previous* step failed — the
reviewer finished its job; the reviewed work is what needs rework. Because a
step is self-contained (agent + stage + artifact inputs), parallel execution
later only replaces the runner's for-loop with a scheduler.

**Event bus.** Synchronous typed pub/sub carrying `mission.*`, `agent.*` and
`timeline.entry` events. In main, `runtime/bridge.ts` is the single
subscriber that (1) forwards every event to renderer windows over the
`runtime:event` push channel and (2) persists durable consequences through
the existing repositories — specs get authored by agents, preview images land
in Screenshot History, rejection reasons file QA items, and every curated
step is written to the activity timeline. Agents and the runner know nothing
about storage.

**Simulated providers.** `SimulatedAgent` turns a timed script into a paced,
cancellable stream (scaled by `AI_STUDIO_SIM_SPEED` for demos/tests). The
scripted narrative exercises every runtime path: QA rejects the first build
(footer anchoring), the mission parks as failed, Retry sends the Engineer on
a rework pass with the QA feedback artifact in context, and the second review
approves.

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

## Phase 3 seams (real providers)

- A Claude Code provider is a class implementing `Agent` that spawns the CLI
  and maps its stream-json output to `AgentEvent`s; ChatGPT/Gemini providers
  map API deltas the same way. Registration is one line in
  `main/runtime/index.ts` — nothing else in the app changes.
- Real artifacts (actual code, real screenshots) flow through the same
  artifact events; the bridge already materializes them into panels.
- Parallel or branching pipelines slot into MissionRunner behind the same
  run/pause/resume/cancel/retry controls.
