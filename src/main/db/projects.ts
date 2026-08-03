import { randomUUID } from 'crypto'
import type { Project } from '@shared/types'
import { getDb } from './index'

interface ProjectRow {
  id: string
  name: string
  brief: string
  status: string
  created_at: number
  updated_at: number
  last_opened_at: number
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    brief: row.brief,
    status: row.status as Project['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at
  }
}

export function listProjects(): Project[] {
  const rows = getDb()
    .prepare('SELECT * FROM projects ORDER BY last_opened_at DESC')
    .all() as ProjectRow[]
  return rows.map(toProject)
}

export function getProject(id: string): Project {
  const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | ProjectRow
    | undefined
  if (!row) throw new Error(`Project not found: ${id}`)
  return toProject(row)
}

export function createProject(name: string, brief: string): Project {
  const now = Date.now()
  const id = randomUUID()
  getDb()
    .prepare(
      `INSERT INTO projects (id, name, brief, status, created_at, updated_at, last_opened_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`
    )
    .run(id, name, brief, now, now, now)
  return getProject(id)
}

export function renameProject(id: string, name: string): Project {
  getDb().prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(name, Date.now(), id)
  return getProject(id)
}

export function updateProjectBrief(id: string, brief: string): Project {
  getDb()
    .prepare('UPDATE projects SET brief = ?, updated_at = ? WHERE id = ?')
    .run(brief, Date.now(), id)
  return getProject(id)
}

export function deleteProject(id: string): void {
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function touchProject(id: string): void {
  getDb().prepare('UPDATE projects SET last_opened_at = ? WHERE id = ?').run(Date.now(), id)
}
