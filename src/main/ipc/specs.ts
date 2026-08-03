import { createSpec, deleteSpec, getSpec, listSpecs, updateSpec } from '../db/specs'
import { logTimelineEvent } from '../db/timeline'
import { handle } from './registry'

export function registerSpecHandlers(): void {
  handle('specs:list', (projectId) => listSpecs(projectId))

  handle('specs:create', (projectId, title) => {
    const spec = createSpec(projectId, title)
    logTimelineEvent(projectId, 'spec.created', `Created spec “${title}”`)
    return spec
  })

  handle('specs:update', (id, title, content) => updateSpec(id, title, content))

  handle('specs:delete', (id) => {
    const spec = getSpec(id)
    deleteSpec(id)
    logTimelineEvent(spec.projectId, 'spec.deleted', `Deleted spec “${spec.title || 'Untitled'}”`)
  })
}
