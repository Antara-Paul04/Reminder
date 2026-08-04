import type {
  AnnotationInput,
  CategoryScore,
  ClaudeCodeConfig,
  FileUpload,
  LoopPolicy,
  QaSeverity,
  ReviewRecommendation,
  ReviewTheme,
  ScreenshotRole,
  Viewport
} from '@shared/types'

const invoke = window.api.invoke

/** Typed, namespaced facade over the IPC bridge. */
export const api = {
  projects: {
    list: () => invoke('projects:list'),
    create: (name: string, brief: string) => invoke('projects:create', name, brief),
    rename: (id: string, name: string) => invoke('projects:rename', id, name),
    updateBrief: (id: string, brief: string) => invoke('projects:updateBrief', id, brief),
    remove: (id: string) => invoke('projects:delete', id),
    touch: (id: string) => invoke('projects:touch', id)
  },
  inspiration: {
    list: (projectId: string) => invoke('inspiration:list', projectId),
    addImage: (projectId: string, file: FileUpload) =>
      invoke('inspiration:addImage', projectId, file),
    addUrl: (projectId: string, url: string) => invoke('inspiration:addUrl', projectId, url),
    remove: (id: string) => invoke('inspiration:remove', id)
  },
  notes: {
    list: (projectId: string) => invoke('notes:list', projectId),
    create: (projectId: string) => invoke('notes:create', projectId),
    update: (id: string, title: string, content: string) =>
      invoke('notes:update', id, title, content),
    remove: (id: string) => invoke('notes:delete', id)
  },
  specs: {
    list: (projectId: string) => invoke('specs:list', projectId),
    create: (projectId: string, title: string) => invoke('specs:create', projectId, title),
    update: (id: string, title: string, content: string) =>
      invoke('specs:update', id, title, content),
    remove: (id: string) => invoke('specs:delete', id)
  },
  timeline: {
    list: (projectId: string) => invoke('timeline:list', projectId)
  },
  screenshots: {
    list: (projectId: string) => invoke('screenshots:list', projectId),
    remove: (id: string) => invoke('screenshots:remove', id)
  },
  review: {
    import: (
      projectId: string,
      file: FileUpload,
      meta: { role: ScreenshotRole; viewport?: Viewport; theme?: ReviewTheme }
    ) => invoke('review:import', projectId, file, meta),
    iterations: (projectId: string) => invoke('review:iterations', projectId),
    sessions: (projectId: string) => invoke('review:sessions', projectId),
    start: (projectId: string) => invoke('review:start', projectId),
    annotate: (input: AnnotationInput) => invoke('review:annotate', input),
    annotations: (sessionId: string) => invoke('review:annotations', sessionId),
    resolveAnnotation: (id: string, resolved: boolean) =>
      invoke('review:annotation:resolve', id, resolved),
    deleteAnnotation: (id: string) => invoke('review:annotation:delete', id),
    score: (sessionId: string, score: CategoryScore) => invoke('review:score', sessionId, score),
    summary: (sessionId: string, summary: string) => invoke('review:summary', sessionId, summary),
    complete: (sessionId: string, recommendation: ReviewRecommendation, summary?: string) =>
      invoke('review:complete', sessionId, recommendation, summary)
  },
  qa: {
    list: (projectId: string) => invoke('qa:list', projectId),
    add: (projectId: string, content: string, severity: QaSeverity) =>
      invoke('qa:add', projectId, content, severity),
    setStatus: (id: string, status: 'open' | 'resolved') => invoke('qa:setStatus', id, status),
    remove: (id: string) => invoke('qa:delete', id)
  },
  agents: {
    list: () => invoke('agents:list')
  },
  missions: {
    list: (projectId: string) => invoke('missions:list', projectId),
    start: (projectId: string) => invoke('missions:start', projectId),
    pause: (missionId: string) => invoke('missions:pause', missionId),
    resume: (missionId: string) => invoke('missions:resume', missionId),
    cancel: (missionId: string) => invoke('missions:cancel', missionId),
    retry: (missionId: string) => invoke('missions:retry', missionId),
    artifacts: (missionId: string) => invoke('missions:artifacts', missionId),
    policyGet: () => invoke('missions:policy:get'),
    policySet: (partial: Partial<LoopPolicy>) => invoke('missions:policy:set', partial),
    report: (missionId: string) => invoke('missions:report', missionId),
    checkpoints: (missionId: string) => invoke('missions:checkpoints', missionId),
    archive: (missionId: string, archived: boolean) =>
      invoke('missions:archive', missionId, archived),
    duplicate: (missionId: string) => invoke('missions:duplicate', missionId),
    rollback: (missionId: string, reason?: string) =>
      invoke('missions:rollback', missionId, reason)
  },
  manual: {
    pending: (projectId: string) => invoke('manual:pending', projectId),
    import: (providerId: string, sessionId: string, response: string) =>
      invoke('manual:import', providerId, sessionId, response),
    copy: (providerId: string, sessionId: string) => invoke('manual:copy', providerId, sessionId),
    open: (providerId: string) => invoke('manual:open', providerId),
    sessions: (projectId: string, query?: string) => invoke('manual:sessions', projectId, query)
  },
  providers: {
    list: () => invoke('providers:list'),
    select: (agentId: string, providerId: string, projectId?: string) =>
      invoke('providers:select', agentId, providerId, projectId),
    connect: (providerId: string) => invoke('providers:connect', providerId),
    disconnect: (providerId: string) => invoke('providers:disconnect', providerId)
  },
  claudeCode: {
    getConfig: () => invoke('claudecode:config:get'),
    setConfig: (partial: Partial<ClaudeCodeConfig>) => invoke('claudecode:config:set', partial),
    health: () => invoke('claudecode:health')
  },
  app: {
    info: () => invoke('app:info')
  }
}
