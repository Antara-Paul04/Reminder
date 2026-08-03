/**
 * Ordered list of migrations. `user_version` tracks how many have been
 * applied. Append new migrations — never edit existing ones.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE projects (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    brief          TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    last_opened_at INTEGER NOT NULL
  );

  CREATE TABLE inspiration_items (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    file_path  TEXT,
    url        TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_inspiration_project ON inspiration_items(project_id);

  CREATE TABLE notes (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_notes_project ON notes(project_id);

  CREATE TABLE specs (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    author     TEXT NOT NULL DEFAULT 'you',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_specs_project ON specs(project_id);

  CREATE TABLE timeline_events (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    message    TEXT NOT NULL,
    actor      TEXT NOT NULL DEFAULT 'you',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_timeline_project ON timeline_events(project_id, created_at DESC);

  CREATE TABLE screenshots (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path  TEXT NOT NULL,
    label      TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_screenshots_project ON screenshots(project_id);

  CREATE TABLE qa_items (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    severity   TEXT NOT NULL DEFAULT 'medium',
    status     TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_qa_project ON qa_items(project_id);
  `
]
