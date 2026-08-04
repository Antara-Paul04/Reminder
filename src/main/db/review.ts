import { randomUUID } from 'crypto'
import type {
  Annotation,
  CategoryScore,
  IterationRecord,
  ReviewSessionRecord
} from '@shared/types'
import { getDb } from './index'

// ---------------------------------------------------------------------------
// Iterations
// ---------------------------------------------------------------------------

interface IterationRow {
  id: string
  project_id: string
  mission_id: string | null
  idx: number
  status: string
  created_at: number
  updated_at: number
}

function toIteration(row: IterationRow): IterationRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    missionId: row.mission_id,
    index: row.idx,
    status: row.status as IterationRecord['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listIterations(projectId: string): IterationRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM iterations WHERE project_id = ? ORDER BY idx DESC')
    .all(projectId) as IterationRow[]
  return rows.map(toIteration)
}

export function currentIteration(projectId: string): IterationRecord | null {
  const row = getDb()
    .prepare('SELECT * FROM iterations WHERE project_id = ? ORDER BY idx DESC LIMIT 1')
    .get(projectId) as IterationRow | undefined
  return row ? toIteration(row) : null
}

/**
 * Reuses the latest iteration when it belongs to the same mission (or when
 * no mission scope is given); otherwise begins the next iteration. History
 * is append-only — iterations are never deleted.
 */
export function ensureIteration(projectId: string, missionId: string | null): IterationRecord {
  const latest = currentIteration(projectId)
  if (latest && (missionId === null || latest.missionId === missionId)) return latest

  const now = Date.now()
  const record: IterationRecord = {
    id: randomUUID(),
    projectId,
    missionId,
    index: (latest?.index ?? 0) + 1,
    status: 'building',
    createdAt: now,
    updatedAt: now
  }
  getDb()
    .prepare(
      `INSERT INTO iterations (id, project_id, mission_id, idx, status, created_at, updated_at)
       VALUES (@id, @projectId, @missionId, @index, @status, @createdAt, @updatedAt)`
    )
    .run(record)
  return record
}

export function setIterationStatus(id: string, status: IterationRecord['status']): void {
  getDb()
    .prepare('UPDATE iterations SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, Date.now(), id)
}

// ---------------------------------------------------------------------------
// Review sessions
// ---------------------------------------------------------------------------

interface SessionRow {
  id: string
  project_id: string
  mission_id: string | null
  iteration: number
  status: string
  reviewer: string
  scores: string
  summary: string
  recommendation: string | null
  created_at: number
  completed_at: number | null
}

function toSession(row: SessionRow): ReviewSessionRecord {
  let scores: CategoryScore[] = []
  try {
    scores = JSON.parse(row.scores) as CategoryScore[]
  } catch {
    scores = []
  }
  return {
    id: row.id,
    projectId: row.project_id,
    missionId: row.mission_id,
    iteration: row.iteration,
    status: row.status as ReviewSessionRecord['status'],
    reviewer: row.reviewer,
    scores,
    summary: row.summary,
    recommendation: row.recommendation as ReviewSessionRecord['recommendation'],
    createdAt: row.created_at,
    completedAt: row.completed_at
  }
}

export function listReviewSessions(projectId: string): ReviewSessionRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM review_sessions WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as SessionRow[]
  return rows.map(toSession)
}

export function getReviewSession(id: string): ReviewSessionRecord | null {
  const row = getDb().prepare('SELECT * FROM review_sessions WHERE id = ?').get(id) as
    | SessionRow
    | undefined
  return row ? toSession(row) : null
}

export function insertReviewSession(session: ReviewSessionRecord): void {
  getDb()
    .prepare(
      `INSERT INTO review_sessions
         (id, project_id, mission_id, iteration, status, reviewer, scores, summary, recommendation, created_at, completed_at)
       VALUES (@id, @projectId, @missionId, @iteration, @status, @reviewer, @scores, @summary, @recommendation, @createdAt, @completedAt)`
    )
    .run({ ...session, scores: JSON.stringify(session.scores) })
}

export function updateReviewSession(session: ReviewSessionRecord): void {
  getDb()
    .prepare(
      `UPDATE review_sessions SET
         status = @status, scores = @scores, summary = @summary,
         recommendation = @recommendation, completed_at = @completedAt
       WHERE id = @id`
    )
    .run({ ...session, scores: JSON.stringify(session.scores) })
}

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

interface AnnotationRow {
  id: string
  session_id: string
  screenshot_id: string
  x: number
  y: number
  text: string
  category: string | null
  severity: string
  author: string
  resolved: number
  created_at: number
}

function toAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    sessionId: row.session_id,
    screenshotId: row.screenshot_id,
    x: row.x,
    y: row.y,
    text: row.text,
    category: row.category as Annotation['category'],
    severity: row.severity as Annotation['severity'],
    author: row.author,
    resolved: row.resolved === 1,
    createdAt: row.created_at
  }
}

export function listAnnotations(sessionId: string): Annotation[] {
  const rows = getDb()
    .prepare('SELECT * FROM annotations WHERE session_id = ? ORDER BY created_at')
    .all(sessionId) as AnnotationRow[]
  return rows.map(toAnnotation)
}

export function insertAnnotation(annotation: Annotation): void {
  getDb()
    .prepare(
      `INSERT INTO annotations
         (id, session_id, screenshot_id, x, y, text, category, severity, author, resolved, created_at)
       VALUES (@id, @sessionId, @screenshotId, @x, @y, @text, @category, @severity, @author, @resolved, @createdAt)`
    )
    .run({ ...annotation, resolved: annotation.resolved ? 1 : 0 })
}

export function setAnnotationResolved(id: string, resolved: boolean): void {
  getDb().prepare('UPDATE annotations SET resolved = ? WHERE id = ?').run(resolved ? 1 : 0, id)
}

export function deleteAnnotation(id: string): void {
  getDb().prepare('DELETE FROM annotations WHERE id = ?').run(id)
}
