import { randomUUID } from 'crypto'
import type { Note } from '@shared/types'
import { getDb } from './index'

interface NoteRow {
  id: string
  project_id: string
  title: string
  content: string
  created_at: number
  updated_at: number
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function listNotes(projectId: string): Note[] {
  const rows = getDb()
    .prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC')
    .all(projectId) as NoteRow[]
  return rows.map(toNote)
}

export function getNote(id: string): Note {
  const row = getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined
  if (!row) throw new Error(`Note not found: ${id}`)
  return toNote(row)
}

export function createNote(projectId: string): Note {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO notes (id, project_id, title, content, created_at, updated_at)
       VALUES (?, ?, '', '', ?, ?)`
    )
    .run(id, projectId, now, now)
  return getNote(id)
}

export function updateNote(id: string, title: string, content: string): Note {
  getDb()
    .prepare('UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?')
    .run(title, content, Date.now(), id)
  return getNote(id)
}

export function deleteNote(id: string): void {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id)
}
