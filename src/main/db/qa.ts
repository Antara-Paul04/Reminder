import { randomUUID } from 'crypto'
import type { QaItem, QaSeverity, QaStatus } from '@shared/types'
import { getDb } from './index'

interface QaRow {
  id: string
  project_id: string
  content: string
  severity: string
  status: string
  created_at: number
}

function toQaItem(row: QaRow): QaItem {
  return {
    id: row.id,
    projectId: row.project_id,
    content: row.content,
    severity: row.severity as QaSeverity,
    status: row.status as QaStatus,
    createdAt: row.created_at
  }
}

export function listQaItems(projectId: string): QaItem[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM qa_items WHERE project_id = ?
       ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC`
    )
    .all(projectId) as QaRow[]
  return rows.map(toQaItem)
}

export function getQaItem(id: string): QaItem {
  const row = getDb().prepare('SELECT * FROM qa_items WHERE id = ?').get(id) as QaRow | undefined
  if (!row) throw new Error(`QA item not found: ${id}`)
  return toQaItem(row)
}

export function insertQaItem(projectId: string, content: string, severity: QaSeverity): QaItem {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO qa_items (id, project_id, content, severity, status, created_at)
       VALUES (?, ?, ?, ?, 'open', ?)`
    )
    .run(id, projectId, content, severity, now)
  return getQaItem(id)
}

export function setQaStatus(id: string, status: QaStatus): QaItem {
  getDb().prepare('UPDATE qa_items SET status = ? WHERE id = ?').run(status, id)
  return getQaItem(id)
}

export function deleteQaItem(id: string): void {
  getDb().prepare('DELETE FROM qa_items WHERE id = ?').run(id)
}
