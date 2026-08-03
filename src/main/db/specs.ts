import { randomUUID } from 'crypto'
import type { Spec } from '@shared/types'
import { getDb } from './index'

interface SpecRow {
  id: string
  project_id: string
  title: string
  content: string
  author: string
  created_at: number
  updated_at: number
}

function toSpec(row: SpecRow): Spec {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    author: row.author,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listSpecs(projectId: string): Spec[] {
  const rows = getDb()
    .prepare('SELECT * FROM specs WHERE project_id = ? ORDER BY updated_at DESC')
    .all(projectId) as SpecRow[]
  return rows.map(toSpec)
}

export function getSpec(id: string): Spec {
  const row = getDb().prepare('SELECT * FROM specs WHERE id = ?').get(id) as SpecRow | undefined
  if (!row) throw new Error(`Spec not found: ${id}`)
  return toSpec(row)
}

export function createSpec(projectId: string, title: string): Spec {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO specs (id, project_id, title, content, author, created_at, updated_at)
       VALUES (?, ?, ?, '', 'you', ?, ?)`
    )
    .run(id, projectId, title, now, now)
  return getSpec(id)
}

export function updateSpec(id: string, title: string, content: string): Spec {
  getDb()
    .prepare('UPDATE specs SET title = ?, content = ?, updated_at = ? WHERE id = ?')
    .run(title, content, Date.now(), id)
  return getSpec(id)
}

export function deleteSpec(id: string): void {
  getDb().prepare('DELETE FROM specs WHERE id = ?').run(id)
}
