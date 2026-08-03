import { listAgents } from '../agents/roster'
import { listTimelineEvents } from '../db/timeline'
import { registerInspirationHandlers } from './inspiration'
import { registerNoteHandlers } from './notes'
import { registerProjectHandlers } from './projects'
import { registerQaHandlers } from './qa'
import { registerScreenshotHandlers } from './screenshots'
import { registerSpecHandlers } from './specs'
import { handle } from './registry'

export function registerIpcHandlers(): void {
  registerProjectHandlers()
  registerInspirationHandlers()
  registerNoteHandlers()
  registerSpecHandlers()
  registerScreenshotHandlers()
  registerQaHandlers()

  handle('timeline:list', (projectId) => listTimelineEvents(projectId))
  handle('agents:list', () => listAgents())
}
