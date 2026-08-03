import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { RendererApi } from '../shared/ipc'

const channels = new Set<string>(IPC_CHANNELS)

const api: RendererApi = {
  invoke: (channel, ...args) => {
    if (!channels.has(channel)) {
      return Promise.reject(new Error(`Unknown IPC channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  }
}

contextBridge.exposeInMainWorld('api', api)
