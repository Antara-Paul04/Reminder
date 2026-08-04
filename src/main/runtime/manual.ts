import { clipboard, shell } from 'electron'
import type { ProviderEventEmitter } from '../../core/providers/ProviderEvents'
import { createManualWebProviders, ManualProvider } from '../../core/providers/manual/ManualProvider'
import type { ManualSessionStore } from '../../core/providers/manual/ManualSession'
import {
  cancelManualSession,
  completeManualSession,
  insertManualSession
} from '../db/manualSessions'

let manualProviders = new Map<string, ManualProvider>()

/** Electron-backed ports + the built-in manual web providers. */
export function buildManualProviders(emit: ProviderEventEmitter): ManualProvider[] {
  const sessions: ManualSessionStore = {
    create: (record) => insertManualSession(record),
    complete: (id, response, result) => completeManualSession(id, response, result),
    cancel: (id) => cancelManualSession(id)
  }

  const providers = createManualWebProviders({
    clipboard: { writeText: (text) => clipboard.writeText(text) },
    opener: { openExternal: (url) => void shell.openExternal(url) },
    sessions,
    emit
  })

  manualProviders = new Map(providers.map((p) => [p.id, p]))
  return providers
}

export function getManualProvider(providerId: string): ManualProvider {
  const provider = manualProviders.get(providerId)
  if (!provider) throw new Error(`Not a manual provider: ${providerId}`)
  return provider
}

export function listManualProviders(): ManualProvider[] {
  return [...manualProviders.values()]
}
