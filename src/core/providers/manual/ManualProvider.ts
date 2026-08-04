import { MissionCancelledError } from '../../runtime/types'
import type { Provider } from '../Provider'
import type { ProviderEventEmitter, ProviderStreamEvent } from '../ProviderEvents'
import { providerEvent } from '../ProviderEvents'
import type { Capability, ProviderExecutionRequest, ProviderStatus } from '../types'
import { NoopClipboard, NoopOpener, type ClipboardPort, type OpenerPort } from './ClipboardService'
import { artifactsFromResponse } from './ManualArtifacts'
import {
  createSessionRecord,
  NoopManualSessionStore,
  type ManualSessionRecord,
  type ManualSessionStore
} from './ManualSession'
import { generatePrompt } from './PromptGenerator'
import { parseResponse } from './PromptParser'

/** What the renderer needs to drive a pending manual interaction. */
export interface PendingManualRequest {
  sessionId: string
  providerId: string
  providerName: string
  agentId: string
  missionId: string
  projectId: string
  prompt: string
  destinationLabel: string
  destinationUrl: string
  createdAt: number
}

export interface ManualProviderOptions {
  id: string
  name: string
  description: string
  capabilities: Capability[]
  destination: { label: string; url: string }
  clipboard?: ClipboardPort
  opener?: OpenerPort
  sessions?: ManualSessionStore
  emit?: ProviderEventEmitter
}

interface PendingWait {
  record: ManualSessionRecord
  request: ProviderExecutionRequest
  resolve: (response: string) => void
  reject: (error: Error) => void
}

/**
 * A provider for AIs that cannot be reached programmatically (ChatGPT web,
 * Claude.ai, Gemini web…). It generates a deterministic prompt, copies it
 * to the clipboard, parks its stream in 'waiting', and resumes when the
 * user imports the response — which is parsed into the same artifacts and
 * verdicts a fully automated provider would emit. The runtime cannot tell
 * the difference; that is the point.
 *
 * No browser automation, no scraping: the human carries the payload.
 */
export class ManualProvider implements Provider {
  readonly id: string
  readonly name: string
  readonly type = 'manual' as const
  readonly capabilities: Capability[]
  readonly description: string
  readonly destination: { label: string; url: string }
  status: ProviderStatus = 'disconnected'

  private readonly clipboard: ClipboardPort
  private readonly opener: OpenerPort
  private readonly sessions: ManualSessionStore
  private readonly emit: ProviderEventEmitter
  private readonly pendingWaits = new Map<string, PendingWait>()

  constructor(options: ManualProviderOptions) {
    this.id = options.id
    this.name = options.name
    this.description = options.description
    this.capabilities = options.capabilities
    this.destination = options.destination
    this.clipboard = options.clipboard ?? new NoopClipboard()
    this.opener = options.opener ?? new NoopOpener()
    this.sessions = options.sessions ?? new NoopManualSessionStore()
    this.emit = options.emit ?? (() => {})
  }

  connect(): Promise<void> {
    return Promise.resolve() // No auth — the human brings the session.
  }

  disconnect(): Promise<void> {
    return Promise.resolve()
  }

  async *execute(request: ProviderExecutionRequest): AsyncGenerator<ProviderStreamEvent> {
    const prompt = generatePrompt(request, this.name)
    const record = createSessionRecord({
      projectId: request.context.mission.projectId,
      missionId: request.context.mission.id,
      agentId: request.agentId,
      providerId: this.id,
      prompt
    })
    this.sessions.create(record)
    this.clipboard.writeText(prompt)

    yield { type: 'status', status: 'working' }
    yield {
      type: 'message',
      text: `Prompt generated and copied to your clipboard. Paste it into ${this.destination.label}, then import the response here.`
    }

    this.emit(
      providerEvent('manual.prompt', {
        providerId: this.id,
        agentId: request.agentId,
        missionId: record.missionId,
        projectId: record.projectId,
        sessionId: record.id,
        prompt,
        destinationLabel: this.destination.label,
        destinationUrl: this.destination.url
      })
    )

    yield { type: 'status', status: 'waiting' }
    const response = await this.waitForResponse(record, request)

    yield { type: 'status', status: 'working' }
    const parsed = parseResponse(response)
    const artifacts = artifactsFromResponse(parsed, response, request.capability)

    const respondedAt = Date.now()
    this.sessions.complete(record.id, response, {
      artifactNames: artifacts.map((a) => a.name),
      decisions: parsed.decisions,
      tasks: parsed.tasks
    })
    this.emit(
      providerEvent('manual.imported', {
        providerId: this.id,
        agentId: request.agentId,
        missionId: record.missionId,
        projectId: record.projectId,
        sessionId: record.id,
        artifactCount: artifacts.length
      })
    )

    yield {
      type: 'message',
      text: `Response imported after ${formatDuration(respondedAt - record.createdAt)} — ${parsed.sections.length} section${parsed.sections.length === 1 ? '' : 's'}, ${artifacts.length} artifact${artifacts.length === 1 ? '' : 's'}, ${parsed.decisions.length} decision${parsed.decisions.length === 1 ? '' : 's'}.`
    }
    for (const artifact of artifacts) {
      yield { type: 'artifact', artifact }
    }
    for (const decision of parsed.decisions) {
      yield { type: 'message', text: `Decision: ${decision}` }
    }

    if (request.capability === 'design-qa') {
      if (parsed.verdict) {
        yield {
          type: 'message',
          text: parsed.verdict.approved
            ? 'Verdict: approved.'
            : `Verdict: rejected. ${parsed.verdict.reason ?? ''}`.trim()
        }
        yield { type: 'verdict', ...parsed.verdict }
      } else {
        yield {
          type: 'message',
          text: 'No explicit verdict found in the response — treating the review as approved.'
        }
        yield { type: 'verdict', approved: true }
      }
    }
  }

  // -- interaction surface (driven by the host via IPC) ---------------------

  /** Resolve a pending wait with the pasted response. */
  importResponse(sessionId: string, response: string): void {
    const wait = this.pendingWaits.get(sessionId)
    if (!wait) throw new Error(`No pending manual session: ${sessionId}`)
    if (!response.trim()) throw new Error('Response is empty')
    wait.resolve(response)
  }

  /** Copy a pending session's prompt to the clipboard again. */
  copyPrompt(sessionId: string): void {
    const wait = this.pendingWaits.get(sessionId)
    if (!wait) throw new Error(`No pending manual session: ${sessionId}`)
    this.clipboard.writeText(wait.record.prompt)
  }

  /** Open the external AI in the user's browser/app. */
  openDestination(): void {
    this.opener.openExternal(this.destination.url)
  }

  pending(projectId?: string): PendingManualRequest[] {
    return [...this.pendingWaits.values()]
      .filter((w) => !projectId || w.record.projectId === projectId)
      .map((w) => ({
        sessionId: w.record.id,
        providerId: this.id,
        providerName: this.name,
        agentId: w.record.agentId,
        missionId: w.record.missionId,
        projectId: w.record.projectId,
        prompt: w.record.prompt,
        destinationLabel: this.destination.label,
        destinationUrl: this.destination.url,
        createdAt: w.record.createdAt
      }))
  }

  private waitForResponse(
    record: ManualSessionRecord,
    request: ProviderExecutionRequest
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const wait: PendingWait = {
        record,
        request,
        resolve: (response) => {
          cleanup()
          resolve(response)
        },
        reject: (error) => {
          cleanup()
          this.sessions.cancel(record.id)
          reject(error)
        }
      }
      const onAbort = () => wait.reject(new MissionCancelledError())
      const cleanup = () => {
        this.pendingWaits.delete(record.id)
        request.context.signal.removeEventListener('abort', onAbort)
      }
      if (request.context.signal.aborted) {
        this.sessions.cancel(record.id)
        reject(new MissionCancelledError())
        return
      }
      this.pendingWaits.set(record.id, wait)
      request.context.signal.addEventListener('abort', onAbort, { once: true })
    })
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

/** The built-in manual destinations. */
export function createManualWebProviders(
  ports: {
    clipboard: ClipboardPort
    opener: OpenerPort
    sessions: ManualSessionStore
    emit: ProviderEventEmitter
  }
): ManualProvider[] {
  const capabilities: Capability[] = ['creative-direction', 'engineering', 'design-qa']
  const make = (id: string, name: string, url: string, description: string) =>
    new ManualProvider({
      id,
      name,
      description,
      capabilities,
      destination: { label: name, url },
      ...ports
    })

  return [
    make('chatgpt', 'ChatGPT', 'https://chatgpt.com',
      'Manual bridge — you carry prompts to ChatGPT and paste responses back'),
    make('claude-web', 'Claude', 'https://claude.ai',
      'Manual bridge — you carry prompts to Claude and paste responses back'),
    make('gemini-web', 'Gemini', 'https://gemini.google.com',
      'Manual bridge — you carry prompts to Gemini and paste responses back')
  ]
}
