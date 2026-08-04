/**
 * Every manual interaction is a SESSION: the prompt we generated, where it
 * went, what came back, how long it took, and what it produced. Sessions
 * are persisted by the host (searchable later) through the store port.
 */

export type ManualSessionStatus = 'pending' | 'completed' | 'cancelled'

export interface ManualSessionRecord {
  id: string
  projectId: string
  missionId: string
  agentId: string
  providerId: string
  prompt: string
  response: string | null
  status: ManualSessionStatus
  decisions: string[]
  tasks: string[]
  artifactNames: string[]
  createdAt: number
  respondedAt: number | null
  durationMs: number | null
}

/** Persistence port implemented by the host (SQLite in main). */
export interface ManualSessionStore {
  create(record: ManualSessionRecord): void
  complete(
    id: string,
    response: string,
    result: { artifactNames: string[]; decisions: string[]; tasks: string[] }
  ): void
  cancel(id: string): void
}

export class NoopManualSessionStore implements ManualSessionStore {
  create(): void {}
  complete(): void {}
  cancel(): void {}
}

export function createSessionRecord(input: {
  projectId: string
  missionId: string
  agentId: string
  providerId: string
  prompt: string
}): ManualSessionRecord {
  return {
    id: crypto.randomUUID(),
    ...input,
    response: null,
    status: 'pending',
    decisions: [],
    tasks: [],
    artifactNames: [],
    createdAt: Date.now(),
    respondedAt: null,
    durationMs: null
  }
}
