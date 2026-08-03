import type { MissionInput } from '../../core/runtime/Mission'
import { getProject } from '../db/projects'
import { listNotes } from '../db/notes'
import { listInspiration } from '../db/inspiration'
import { countMissions } from '../db/missions'

/**
 * Assembles everything a mission needs from the project's stored material:
 * the brief, notes, and inspiration references.
 */
export function buildMissionInput(projectId: string): MissionInput {
  const project = getProject(projectId)
  const notes = listNotes(projectId)
  const inspiration = listInspiration(projectId)

  return {
    projectId,
    title: `${project.name} — Mission ${countMissions(projectId) + 1}`,
    brief: project.brief,
    notes: notes.map((n) => (n.title ? `${n.title}: ${n.content}` : n.content)).filter(Boolean),
    references: inspiration.map((item) => ({
      kind: item.kind,
      title: item.title,
      url: item.url
    }))
  }
}
