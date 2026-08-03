import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC_CHANNELS, RUNTIME_EVENT_CHANNEL } from '../shared/ipc'
import type { RendererApi } from '../shared/ipc'
import type { RuntimeEvent } from '../core/runtime/types'

const channels = new Set<string>(IPC_CHANNELS)

const api: RendererApi = {
  invoke: (channel, ...args) => {
    if (!channels.has(channel)) {
      return Promise.reject(new Error(`Unknown IPC channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },

  onRuntimeEvent: (handler) => {
    const listener = (_event: IpcRendererEvent, runtimeEvent: RuntimeEvent) => handler(runtimeEvent)
    ipcRenderer.on(RUNTIME_EVENT_CHANNEL, listener)
    return () => ipcRenderer.removeListener(RUNTIME_EVENT_CHANNEL, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
