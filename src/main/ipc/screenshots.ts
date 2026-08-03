import { deleteScreenshot, getScreenshot, insertScreenshot, listScreenshots } from '../db/screenshots'
import { logTimelineEvent } from '../db/timeline'
import { deleteLibraryFile, saveLibraryFile } from '../media'
import { handle } from './registry'

export function registerScreenshotHandlers(): void {
  handle('screenshots:list', (projectId) => listScreenshots(projectId))

  handle('screenshots:add', (projectId, file) => {
    const filePath = saveLibraryFile('screenshots', projectId, file)
    const screenshot = insertScreenshot(projectId, filePath, file.name)
    logTimelineEvent(projectId, 'screenshot.added', `Captured screenshot “${file.name}”`)
    return screenshot
  })

  handle('screenshots:remove', (id) => {
    const screenshot = getScreenshot(id)
    deleteScreenshot(id)
    deleteLibraryFile(screenshot.filePath)
    logTimelineEvent(screenshot.projectId, 'screenshot.removed', 'Removed a screenshot')
  })
}
