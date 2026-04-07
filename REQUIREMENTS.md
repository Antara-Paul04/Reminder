# Reminders — Requirements

## Overview
A local-first desktop reminders app built with Tauri + vanilla HTML/CSS/JS. It captures quick natural-language tasks, groups them per person, and tracks who owes what to whom. No backend; all data persists in `localStorage`.

## Goals
- Frictionless task capture via a single input box (and, eventually, voice).
- Organize tasks by person and by bucket (Today / Agenda).
- Track direction of obligation: *they owe me* vs *I owe them*.
- Work offline as a native desktop app.

## Functional Requirements

### Capture
- Single text input; pressing Enter creates a task.
- Natural-language parser extracts:
  - **Person**: matched against the known people list.
  - **Direction**: phrases like "asked me", "for me", "I need to", "gave me" → *I owe them*; default → *they owe me*.
  - **Deadline / bucket**: "today" → Today bucket with today's date; "tomorrow" / "next week" → future deadline.
- If no person is matched, the task is rejected with a prompt to mention a name.
- Mic button is a placeholder for future local voice capture (whisper.cpp).

### Tasks
- Fields: `id`, `text`, `person`, `direction`, `bucket`, `deadline`, `done`, `links`, `createdAt`.
- Operations: add, toggle done, flip direction, move between buckets, reassign person via drag-and-drop.
- Completed tasks are hidden from bucket views.

### Views
- **Today's Deadlines** bucket and **Agendas** bucket, each grouped by person.
- Tasks are draggable between buckets and person blocks.
- **Calendar** sidebar: month grid with prev/next navigation; highlights today and days that have open tasks.
- **Urgent** panel (placeholder for future prioritization).
- Responsive drawer for the sidebar on small screens.

### Persistence
- State stored in `localStorage` under the key `reminders.state`.
- Migration path for legacy `owner` field → `person` + `direction`.
- Seed people list: Setal, Rahul, Pragadees, Aman, Anand, Ashil, Neeraj, Vishnu.

## Non-Functional Requirements
- **Local-first**: no network calls for core functionality.
- **Lightweight**: vanilla JS, no frontend framework.
- **Cross-platform**: packaged via Tauri 2 (macOS, Windows, Linux).
- **Privacy**: all data stays on the user's device.

## Out of Scope (for now)
- Sync across devices.
- Voice transcription (planned: whisper.cpp).
- Notifications / reminders at deadline time.
- Editing task text after creation.

## Tech Stack
- Frontend: HTML, CSS, vanilla JavaScript (ES modules).
- Shell: Tauri 2 (Rust).
- Storage: browser `localStorage`.
