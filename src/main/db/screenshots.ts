import type { ScreenshotArtifactMeta } from '@shared/types'
import { getDb } from './index'

interface ScreenshotRow {
  id: string
  project_id: string
  mission_id: string | null
  iteration: number
  file_path: string
  label: string
  viewport: string
  theme: string
  source: string
  role: string
  created_at: number
}

function toMeta(row: ScreenshotRow): ScreenshotArtifactMeta {
  return {
    id: row.id,
    projectId: row.project_id,
    missionId: row.mission_id,
    iteration: row.iteration,
    filePath: row.file_path,
    label: row.label,
    viewport: row.viewport as ScreenshotArtifactMeta['viewport'],
    theme: row.theme as ScreenshotArtifactMeta['theme'],
    source: row.source as ScreenshotArtifactMeta['source'],
    role: row.role as ScreenshotArtifactMeta['role'],
    createdAt: row.created_at
  }
}

export function listScreenshots(projectId: string): ScreenshotArtifactMeta[] {
  const rows = getDb()
    .prepare('SELECT * FROM screenshots WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as ScreenshotRow[]
  return rows.map(toMeta)
}

export function getScreenshot(id: string): ScreenshotArtifactMeta {
  const row = getDb().prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as
    | ScreenshotRow
    | undefined
  if (!row) throw new Error(`Screenshot not found: ${id}`)
  return toMeta(row)
}

export function insertScreenshotMeta(meta: ScreenshotArtifactMeta): void {
  getDb()
    .prepare(
      `INSERT INTO screenshots
         (id, project_id, mission_id, iteration, file_path, label, viewport, theme, source, role, created_at)
       VALUES (@id, @projectId, @missionId, @iteration, @filePath, @label, @viewport, @theme, @source, @role, @createdAt)`
    )
    .run(meta)
}

export function deleteScreenshot(id: string): void {
  getDb().prepare('DELETE FROM screenshots WHERE id = ?').run(id)
}
