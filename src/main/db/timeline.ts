import { randomUUID } from 'crypto'
import type { TimelineEvent, TimelineEventType } from '@shared/types'
import { getDb } from './index'

interface TimelineRow {
  id: string
  project_id: string
  type: string
  message: string
  actor: string
  created_at: number
}

function toEvent(row: TimelineRow): TimelineEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as TimelineEventType,
    message: row.message,
    actor: row.actor,
    createdAt: row.created_at
  }
}

export function listTimelineEvents(projectId: string, limit = 300): TimelineEvent[] {
  const rows = getDb()
    .prepare(
      'SELECT * FROM timeline_events WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?'
    )
    .all(projectId, limit) as TimelineRow[]
  return rows.map(toEvent)
}

export function logTimelineEvent(
  projectId: string,
  type: TimelineEventType,
  message: string,
  actor = 'you'
): TimelineEvent {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO timeline_events (id, project_id, type, message, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, projectId, type, message, actor, now)
  return { id, projectId, type, message, actor, createdAt: now }
}
