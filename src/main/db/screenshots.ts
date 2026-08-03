import { randomUUID } from 'crypto'
import type { Screenshot } from '@shared/types'
import { getDb } from './index'

interface ScreenshotRow {
  id: string
  project_id: string
  file_path: string
  label: string
  created_at: number
}

function toScreenshot(row: ScreenshotRow): Screenshot {
  return {
    id: row.id,
    projectId: row.project_id,
    filePath: row.file_path,
    label: row.label,
    createdAt: row.created_at
  }
}

export function listScreenshots(projectId: string): Screenshot[] {
  const rows = getDb()
    .prepare('SELECT * FROM screenshots WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as ScreenshotRow[]
  return rows.map(toScreenshot)
}

export function getScreenshot(id: string): Screenshot {
  const row = getDb().prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as
    | ScreenshotRow
    | undefined
  if (!row) throw new Error(`Screenshot not found: ${id}`)
  return toScreenshot(row)
}

export function insertScreenshot(projectId: string, filePath: string, label: string): Screenshot {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO screenshots (id, project_id, file_path, label, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, projectId, filePath, label, now)
  return getScreenshot(id)
}

export function deleteScreenshot(id: string): void {
  getDb().prepare('DELETE FROM screenshots WHERE id = ?').run(id)
}
