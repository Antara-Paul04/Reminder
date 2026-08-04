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
  `,
  `
  CREATE TABLE missions (
    id                TEXT PRIMARY KEY,
    project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    brief             TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL,
    stage             TEXT NOT NULL,
    failed_step_index INTEGER,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL
  );
  CREATE INDEX idx_missions_project ON missions(project_id, created_at DESC);

  CREATE TABLE mission_artifacts (
    id          TEXT PRIMARY KEY,
    mission_id  TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    created_by  TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX idx_artifacts_mission ON mission_artifacts(mission_id, created_at);
  `,
  `
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE manual_sessions (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mission_id     TEXT NOT NULL,
    agent_id       TEXT NOT NULL,
    provider_id    TEXT NOT NULL,
    prompt         TEXT NOT NULL,
    response       TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    decisions      TEXT NOT NULL DEFAULT '[]',
    tasks          TEXT NOT NULL DEFAULT '[]',
    artifact_names TEXT NOT NULL DEFAULT '[]',
    created_at     INTEGER NOT NULL,
    responded_at   INTEGER,
    duration_ms    INTEGER
  );
  CREATE INDEX idx_manual_sessions_project ON manual_sessions(project_id, created_at DESC);
  `,
  `
  ALTER TABLE screenshots ADD COLUMN mission_id TEXT;
  ALTER TABLE screenshots ADD COLUMN iteration INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE screenshots ADD COLUMN viewport TEXT NOT NULL DEFAULT 'desktop';
  ALTER TABLE screenshots ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark';
  ALTER TABLE screenshots ADD COLUMN source TEXT NOT NULL DEFAULT 'import';
  ALTER TABLE screenshots ADD COLUMN role TEXT NOT NULL DEFAULT 'current';

  CREATE TABLE iterations (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mission_id TEXT,
    idx        INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'building',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_iterations_project ON iterations(project_id, idx DESC);

  CREATE TABLE review_sessions (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mission_id     TEXT,
    iteration      INTEGER NOT NULL,
    status         TEXT NOT NULL DEFAULT 'open',
    reviewer       TEXT NOT NULL DEFAULT 'you',
    scores         TEXT NOT NULL DEFAULT '[]',
    summary        TEXT NOT NULL DEFAULT '',
    recommendation TEXT,
    created_at     INTEGER NOT NULL,
    completed_at   INTEGER
  );
  CREATE INDEX idx_review_sessions_project ON review_sessions(project_id, created_at DESC);

  CREATE TABLE annotations (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
    screenshot_id TEXT NOT NULL,
    x             REAL NOT NULL,
    y             REAL NOT NULL,
    text          TEXT NOT NULL,
    category      TEXT,
    severity      TEXT NOT NULL DEFAULT 'medium',
    author        TEXT NOT NULL DEFAULT 'you',
    resolved      INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );
  CREATE INDEX idx_annotations_session ON annotations(session_id);
  `,
  `
  ALTER TABLE missions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

  CREATE TABLE mission_checkpoints (
    id             TEXT PRIMARY KEY,
    mission_id     TEXT NOT NULL,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage          TEXT NOT NULL,
    iteration      INTEGER NOT NULL,
    artifact_count INTEGER NOT NULL,
    created_at     INTEGER NOT NULL
  );
  CREATE INDEX idx_checkpoints_mission ON mission_checkpoints(mission_id, created_at);

  CREATE TABLE mission_reports (
    mission_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    data       TEXT NOT NULL,
    markdown   TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_reports_project ON mission_reports(project_id, created_at DESC);
  `
]
