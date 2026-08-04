import type { ManualSessionRecord, ManualSessionStatus } from '@shared/types'
import { getDb } from './index'

interface SessionRow {
  id: string
  project_id: string
  mission_id: string
  agent_id: string
  provider_id: string
  prompt: string
  response: string | null
  status: string
  decisions: string
  tasks: string
  artifact_names: string
  created_at: number
  responded_at: number | null
  duration_ms: number | null
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toRecord(row: SessionRow): ManualSessionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    missionId: row.mission_id,
    agentId: row.agent_id,
    providerId: row.provider_id,
    prompt: row.prompt,
    response: row.response,
    status: row.status as ManualSessionStatus,
    decisions: parseJsonArray(row.decisions),
    tasks: parseJsonArray(row.tasks),
    artifactNames: parseJsonArray(row.artifact_names),
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    durationMs: row.duration_ms
  }
}

export function insertManualSession(record: ManualSessionRecord): void {
  getDb()
    .prepare(
      `INSERT INTO manual_sessions
         (id, project_id, mission_id, agent_id, provider_id, prompt, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      record.id,
      record.projectId,
      record.missionId,
      record.agentId,
      record.providerId,
      record.prompt,
      record.createdAt
    )
}

export function completeManualSession(
  id: string,
  response: string,
  result: { artifactNames: string[]; decisions: string[]; tasks: string[] }
): void {
  const now = Date.now()
  getDb()
    .prepare(
      `UPDATE manual_sessions SET
         response = ?, status = 'completed', artifact_names = ?, decisions = ?, tasks = ?,
         responded_at = ?, duration_ms = ? - created_at
       WHERE id = ?`
    )
    .run(
      response,
      JSON.stringify(result.artifactNames),
      JSON.stringify(result.decisions),
      JSON.stringify(result.tasks),
      now,
      now,
      id
    )
}

export function cancelManualSession(id: string): void {
  getDb().prepare(`UPDATE manual_sessions SET status = 'cancelled' WHERE id = ?`).run(id)
}

/** Pending sessions from a previous app run can never resolve. */
export function cancelOrphanedManualSessions(): void {
  getDb().prepare(`UPDATE manual_sessions SET status = 'cancelled' WHERE status = 'pending'`).run()
}

/** Searchable history: filters across prompt, response and agent/provider. */
export function listManualSessions(projectId: string, query?: string): ManualSessionRecord[] {
  const rows = query?.trim()
    ? (getDb()
        .prepare(
          `SELECT * FROM manual_sessions
           WHERE project_id = @projectId
             AND (prompt LIKE @q OR response LIKE @q OR agent_id LIKE @q OR provider_id LIKE @q)
           ORDER BY created_at DESC`
        )
        .all({ projectId, q: `%${query.trim()}%` }) as SessionRow[])
    : (getDb()
        .prepare(`SELECT * FROM manual_sessions WHERE project_id = ? ORDER BY created_at DESC`)
        .all(projectId) as SessionRow[])
  return rows.map(toRecord)
}
