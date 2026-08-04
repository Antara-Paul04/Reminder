import {
  deleteAnnotation,
  listAnnotations,
  listIterations,
  listReviewSessions,
  setAnnotationResolved
} from '../db/review'
import { deleteScreenshot, getScreenshot, listScreenshots } from '../db/screenshots'
import { logTimelineEvent } from '../db/timeline'
import { deleteLibraryFile, saveLibraryFile } from '../media'
import { getReviewEngine } from '../runtime/review'
import { handle } from './registry'

export function registerReviewHandlers(): void {
  handle('screenshots:list', (projectId) => listScreenshots(projectId))

  handle('screenshots:remove', (id) => {
    const screenshot = getScreenshot(id)
    deleteScreenshot(id)
    deleteLibraryFile(screenshot.filePath)
    logTimelineEvent(screenshot.projectId, 'screenshot.removed', `Removed ${screenshot.label}`, 'you')
  })

  handle('review:import', (projectId, file, meta) => {
    const filePath = saveLibraryFile('screenshots', projectId, file)
    return getReviewEngine().importScreenshot({
      projectId,
      filePath,
      label: file.name,
      role: meta.role,
      viewport: meta.viewport,
      theme: meta.theme,
      source: 'import'
    })
  })

  handle('review:iterations', (projectId) => listIterations(projectId))
  handle('review:sessions', (projectId) => listReviewSessions(projectId))
  handle('review:start', (projectId) => getReviewEngine().startSession(projectId))

  handle('review:annotate', (input) => getReviewEngine().addAnnotation(input))
  handle('review:annotations', (sessionId) => listAnnotations(sessionId))
  handle('review:annotation:resolve', (annotationId, resolved) =>
    setAnnotationResolved(annotationId, resolved)
  )
  handle('review:annotation:delete', (annotationId) => deleteAnnotation(annotationId))

  handle('review:score', (sessionId, score) => getReviewEngine().scoreCategory(sessionId, score))
  handle('review:summary', (sessionId, summary) =>
    getReviewEngine().updateSummary(sessionId, summary)
  )
  handle('review:complete', (sessionId, recommendation, summary) =>
    getReviewEngine().completeSession(sessionId, recommendation, summary)
  )
}
