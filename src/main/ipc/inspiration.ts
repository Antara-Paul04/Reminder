import {
  deleteInspiration,
  getInspiration,
  insertInspiration,
  listInspiration
} from '../db/inspiration'
import { logTimelineEvent } from '../db/timeline'
import { deleteLibraryFile, saveLibraryFile } from '../media'
import { handle } from './registry'

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function registerInspirationHandlers(): void {
  handle('inspiration:list', (projectId) => listInspiration(projectId))

  handle('inspiration:addImage', (projectId, file) => {
    const filePath = saveLibraryFile('inspiration', projectId, file)
    const item = insertInspiration({
      projectId,
      kind: 'image',
      title: file.name,
      filePath,
      url: null
    })
    logTimelineEvent(projectId, 'inspiration.added', `Added inspiration image “${file.name}”`)
    return item
  })

  handle('inspiration:addUrl', (projectId, url) => {
    const item = insertInspiration({
      projectId,
      kind: 'url',
      title: hostnameOf(url),
      filePath: null,
      url
    })
    logTimelineEvent(projectId, 'inspiration.added', `Added reference ${hostnameOf(url)}`)
    return item
  })

  handle('inspiration:remove', (id) => {
    const item = getInspiration(id)
    deleteInspiration(id)
    if (item.filePath) deleteLibraryFile(item.filePath)
    logTimelineEvent(item.projectId, 'inspiration.removed', `Removed “${item.title}”`)
  })
}
