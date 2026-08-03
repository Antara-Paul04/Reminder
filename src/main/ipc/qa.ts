import { deleteQaItem, getQaItem, insertQaItem, listQaItems, setQaStatus } from '../db/qa'
import { logTimelineEvent } from '../db/timeline'
import { handle } from './registry'

export function registerQaHandlers(): void {
  handle('qa:list', (projectId) => listQaItems(projectId))

  handle('qa:add', (projectId, content, severity) => {
    const item = insertQaItem(projectId, content, severity)
    logTimelineEvent(projectId, 'qa.added', `Filed ${severity} severity feedback`)
    return item
  })

  handle('qa:setStatus', (id, status) => {
    const item = setQaStatus(id, status)
    logTimelineEvent(
      item.projectId,
      status === 'resolved' ? 'qa.resolved' : 'qa.reopened',
      status === 'resolved' ? 'Resolved a QA item' : 'Reopened a QA item'
    )
    return item
  })

  handle('qa:delete', (id) => {
    const item = getQaItem(id)
    deleteQaItem(id)
    logTimelineEvent(item.projectId, 'qa.deleted', 'Deleted a QA item')
  })
}
