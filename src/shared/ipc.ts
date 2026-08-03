import type {
  AgentInfo,
  FileUpload,
  InspirationItem,
  Note,
  Project,
  QaItem,
  QaSeverity,
  Screenshot,
  Spec,
  TimelineEvent
} from './types'

/**
 * The complete IPC contract. Every channel maps to a request/response pair.
 * Main implements it, preload forwards it, the renderer consumes it — all
 * against this single source of truth.
 */
export interface IpcContract {
  'projects:list': { req: []; res: Project[] }
  'projects:create': { req: [name: string, brief: string]; res: Project }
  'projects:rename': { req: [id: string, name: string]; res: Project }
  'projects:updateBrief': { req: [id: string, brief: string]; res: Project }
  'projects:delete': { req: [id: string]; res: void }
  'projects:touch': { req: [id: string]; res: void }

  'inspiration:list': { req: [projectId: string]; res: InspirationItem[] }
  'inspiration:addImage': { req: [projectId: string, file: FileUpload]; res: InspirationItem }
  'inspiration:addUrl': { req: [projectId: string, url: string]; res: InspirationItem }
  'inspiration:remove': { req: [id: string]; res: void }

  'notes:list': { req: [projectId: string]; res: Note[] }
  'notes:create': { req: [projectId: string]; res: Note }
  'notes:update': { req: [id: string, title: string, content: string]; res: Note }
  'notes:delete': { req: [id: string]; res: void }

  'specs:list': { req: [projectId: string]; res: Spec[] }
  'specs:create': { req: [projectId: string, title: string]; res: Spec }
  'specs:update': { req: [id: string, title: string, content: string]; res: Spec }
  'specs:delete': { req: [id: string]; res: void }

  'timeline:list': { req: [projectId: string]; res: TimelineEvent[] }

  'screenshots:list': { req: [projectId: string]; res: Screenshot[] }
  'screenshots:add': { req: [projectId: string, file: FileUpload]; res: Screenshot }
  'screenshots:remove': { req: [id: string]; res: void }

  'qa:list': { req: [projectId: string]; res: QaItem[] }
  'qa:add': { req: [projectId: string, content: string, severity: QaSeverity]; res: QaItem }
  'qa:setStatus': { req: [id: string, status: 'open' | 'resolved']; res: QaItem }
  'qa:delete': { req: [id: string]; res: void }

  'agents:list': { req: []; res: AgentInfo[] }
}

export type IpcChannel = keyof IpcContract

export const IPC_CHANNELS: IpcChannel[] = [
  'projects:list',
  'projects:create',
  'projects:rename',
  'projects:updateBrief',
  'projects:delete',
  'projects:touch',
  'inspiration:list',
  'inspiration:addImage',
  'inspiration:addUrl',
  'inspiration:remove',
  'notes:list',
  'notes:create',
  'notes:update',
  'notes:delete',
  'specs:list',
  'specs:create',
  'specs:update',
  'specs:delete',
  'timeline:list',
  'screenshots:list',
  'screenshots:add',
  'screenshots:remove',
  'qa:list',
  'qa:add',
  'qa:setStatus',
  'qa:delete',
  'agents:list'
]

/** Shape of the API exposed on `window.api` by the preload script. */
export interface RendererApi {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: IpcContract[C]['req']
  ): Promise<IpcContract[C]['res']>
}
