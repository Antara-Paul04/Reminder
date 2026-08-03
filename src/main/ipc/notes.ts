import { createNote, deleteNote, getNote, listNotes, updateNote } from '../db/notes'
import { logTimelineEvent } from '../db/timeline'
import { handle } from './registry'

export function registerNoteHandlers(): void {
  handle('notes:list', (projectId) => listNotes(projectId))

  handle('notes:create', (projectId) => {
    const note = createNote(projectId)
    logTimelineEvent(projectId, 'note.created', 'Started a new note')
    return note
  })

  handle('notes:update', (id, title, content) => updateNote(id, title, content))

  handle('notes:delete', (id) => {
    const note = getNote(id)
    deleteNote(id)
    logTimelineEvent(note.projectId, 'note.deleted', `Deleted note “${note.title || 'Untitled'}”`)
  })
}
