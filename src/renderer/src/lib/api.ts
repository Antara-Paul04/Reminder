import type { FileUpload, QaSeverity } from '@shared/types'

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
    add: (projectId: string, file: FileUpload) => invoke('screenshots:add', projectId, file),
    remove: (id: string) => invoke('screenshots:remove', id)
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
    artifacts: (missionId: string) => invoke('missions:artifacts', missionId)
  }
}
