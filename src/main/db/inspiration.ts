import { randomUUID } from 'crypto'
import type { InspirationItem, InspirationKind } from '@shared/types'
import { getDb } from './index'

interface InspirationRow {
  id: string
  project_id: string
  kind: string
  title: string
  file_path: string | null
  url: string | null
  created_at: number
}

function toItem(row: InspirationRow): InspirationItem {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind as InspirationKind,
    title: row.title,
    filePath: row.file_path,
    url: row.url,
    createdAt: row.created_at
  }
}

export function listInspiration(projectId: string): InspirationItem[] {
  const rows = getDb()
    .prepare('SELECT * FROM inspiration_items WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as InspirationRow[]
  return rows.map(toItem)
}

export function getInspiration(id: string): InspirationItem {
  const row = getDb().prepare('SELECT * FROM inspiration_items WHERE id = ?').get(id) as
    | InspirationRow
    | undefined
  if (!row) throw new Error(`Inspiration item not found: ${id}`)
  return toItem(row)
}

export function insertInspiration(input: {
  projectId: string
  kind: InspirationKind
  title: string
  filePath: string | null
  url: string | null
}): InspirationItem {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO inspiration_items (id, project_id, kind, title, file_path, url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.projectId, input.kind, input.title, input.filePath, input.url, now)
  return getInspiration(id)
}

export function deleteInspiration(id: string): void {
  getDb().prepare('DELETE FROM inspiration_items WHERE id = ?').run(id)
}
