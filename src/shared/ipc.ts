import type {
  AgentDescriptor,
  Annotation,
  AnnotationInput,
  AppInfo,
  CategoryScore,
  ClaudeCodeConfig,
  ClaudeCodeHealth,
  FileUpload,
  InspirationItem,
  IterationRecord,
  LoopPolicy,
  ManualSessionRecord,
  MissionArtifactRecord,
  MissionCheckpoint,
  MissionRecord,
  MissionReportData,
  PendingManualRequest,
  Note,
  Project,
  ProviderDescriptor,
  QaItem,
  QaSeverity,
  ReviewRecommendation,
  ReviewSessionRecord,
  ReviewTheme,
  RuntimeEvent,
  ScreenshotArtifactMeta,
  ScreenshotRole,
  Spec,
  TimelineEvent,
  Viewport
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

  'screenshots:list': { req: [projectId: string]; res: ScreenshotArtifactMeta[] }
  'screenshots:remove': { req: [id: string]; res: void }

  'review:import': {
    req: [
      projectId: string,
      file: FileUpload,
      meta: { role: ScreenshotRole; viewport?: Viewport; theme?: ReviewTheme }
    ]
    res: ScreenshotArtifactMeta
  }
  'review:iterations': { req: [projectId: string]; res: IterationRecord[] }
  'review:sessions': { req: [projectId: string]; res: ReviewSessionRecord[] }
  'review:start': { req: [projectId: string]; res: ReviewSessionRecord }
  'review:annotate': { req: [input: AnnotationInput]; res: Annotation }
  'review:annotations': { req: [sessionId: string]; res: Annotation[] }
  'review:annotation:resolve': { req: [annotationId: string, resolved: boolean]; res: void }
  'review:annotation:delete': { req: [annotationId: string]; res: void }
  'review:score': { req: [sessionId: string, score: CategoryScore]; res: ReviewSessionRecord }
  'review:summary': { req: [sessionId: string, summary: string]; res: ReviewSessionRecord }
  'review:complete': {
    req: [sessionId: string, recommendation: ReviewRecommendation, summary?: string]
    res: ReviewSessionRecord
  }

  'qa:list': { req: [projectId: string]; res: QaItem[] }
  'qa:add': { req: [projectId: string, content: string, severity: QaSeverity]; res: QaItem }
  'qa:setStatus': { req: [id: string, status: 'open' | 'resolved']; res: QaItem }
  'qa:delete': { req: [id: string]; res: void }

  'agents:list': { req: []; res: AgentDescriptor[] }

  'missions:list': { req: [projectId: string]; res: MissionRecord[] }
  'missions:start': { req: [projectId: string]; res: MissionRecord }
  'missions:pause': { req: [missionId: string]; res: void }
  'missions:resume': { req: [missionId: string]; res: void }
  'missions:cancel': { req: [missionId: string]; res: void }
  'missions:retry': { req: [missionId: string]; res: void }
  'missions:artifacts': { req: [missionId: string]; res: MissionArtifactRecord[] }
  'missions:policy:get': { req: []; res: LoopPolicy }
  'missions:policy:set': { req: [partial: Partial<LoopPolicy>]; res: LoopPolicy }
  'missions:report': {
    req: [missionId: string]
    res: { data: MissionReportData; markdown: string } | null
  }
  'missions:checkpoints': { req: [missionId: string]; res: MissionCheckpoint[] }
  'missions:archive': { req: [missionId: string, archived: boolean]; res: void }
  'missions:duplicate': { req: [missionId: string]; res: string }
  'missions:rollback': { req: [missionId: string, reason?: string]; res: void }

  'providers:list': { req: []; res: ProviderDescriptor[] }
  'providers:select': {
    req: [agentId: string, providerId: string, projectId?: string]
    res: void
  }
  'providers:connect': { req: [providerId: string]; res: void }
  'providers:disconnect': { req: [providerId: string]; res: void }

  'manual:pending': { req: [projectId: string]; res: PendingManualRequest[] }
  'manual:import': { req: [providerId: string, sessionId: string, response: string]; res: void }
  'manual:copy': { req: [providerId: string, sessionId: string]; res: void }
  'manual:open': { req: [providerId: string]; res: void }
  'manual:sessions': { req: [projectId: string, query?: string]; res: ManualSessionRecord[] }

  'claudecode:config:get': { req: []; res: ClaudeCodeConfig }
  'claudecode:config:set': { req: [partial: Partial<ClaudeCodeConfig>]; res: ClaudeCodeConfig }
  'claudecode:health': { req: []; res: ClaudeCodeHealth }

  'app:info': { req: []; res: AppInfo }
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
  'screenshots:remove',
  'review:import',
  'review:iterations',
  'review:sessions',
  'review:start',
  'review:annotate',
  'review:annotations',
  'review:annotation:resolve',
  'review:annotation:delete',
  'review:score',
  'review:summary',
  'review:complete',
  'qa:list',
  'qa:add',
  'qa:setStatus',
  'qa:delete',
  'agents:list',
  'missions:list',
  'missions:start',
  'missions:pause',
  'missions:resume',
  'missions:cancel',
  'missions:retry',
  'missions:artifacts',
  'missions:policy:get',
  'missions:policy:set',
  'missions:report',
  'missions:checkpoints',
  'missions:archive',
  'missions:duplicate',
  'missions:rollback',
  'providers:list',
  'providers:select',
  'providers:connect',
  'providers:disconnect',
  'manual:pending',
  'manual:import',
  'manual:copy',
  'manual:open',
  'manual:sessions',
  'claudecode:config:get',
  'claudecode:config:set',
  'claudecode:health',
  'app:info'
]

/** Push channel: runtime events streamed main → renderer. */
export const RUNTIME_EVENT_CHANNEL = 'runtime:event'

/** Shape of the API exposed on `window.api` by the preload script. */
export interface RendererApi {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: IpcContract[C]['req']
  ): Promise<IpcContract[C]['res']>
  /** Subscribe to runtime events pushed from main. Returns unsubscribe. */
  onRuntimeEvent(handler: (event: RuntimeEvent) => void): () => void
}
