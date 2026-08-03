import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  renameProject,
  touchProject,
  updateProjectBrief
} from '../db/projects'
import { logTimelineEvent } from '../db/timeline'
import { deleteProjectLibrary } from '../media'
import { handle } from './registry'

export function registerProjectHandlers(): void {
  handle('projects:list', () => listProjects())

  handle('projects:create', (name, brief) => {
    const project = createProject(name, brief)
    logTimelineEvent(project.id, 'project.created', `Created project “${name}”`)
    return project
  })

  handle('projects:rename', (id, name) => {
    const previous = getProject(id)
    const project = renameProject(id, name)
    logTimelineEvent(id, 'project.renamed', `Renamed “${previous.name}” to “${name}”`)
    return project
  })

  handle('projects:updateBrief', (id, brief) => {
    const project = updateProjectBrief(id, brief)
    logTimelineEvent(id, 'project.brief_updated', 'Updated the design brief')
    return project
  })

  handle('projects:delete', (id) => {
    deleteProject(id)
    deleteProjectLibrary(id)
  })

  handle('projects:touch', (id) => touchProject(id))
}
