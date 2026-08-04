import { MissionCancelledError, type ArtifactKind } from '../../runtime/types'
import type { Provider } from '../Provider'
import type { ProviderStreamEvent } from '../ProviderEvents'
import type { Capability, ProviderExecutionRequest, ProviderStatus } from '../types'
import {
  normalizeClaudeCodeConfig,
  type ClaudeCodeConfig,
  type ClaudeCodeHealth
} from './ClaudeCodeConfig'
import type { ProcessLauncher } from './ClaudeCodeProcess'
import { ClaudeCodeSession, type WorkspacePort } from './ClaudeCodeSession'

/** Mutable per-run state shared between the stream loop and finalization. */
interface RunStats {
  result: {
    ok: boolean
    summary: string
    durationMs: number | null
    costUsd: number | null
    turns: number | null
  } | null
  lastError: string | null
}

export interface ClaudeCodeProviderOptions {
  launcher: ProcessLauncher
  workspace: WorkspacePort
  /** Live config lookup so Settings changes apply without re-registration. */
  config: () => ClaudeCodeConfig
}

/**
 * The first real autonomous provider: drives the Claude Code CLI for the
 * Engineer role. From the runtime's perspective it is indistinguishable
 * from the Simulator — connect, execute, stream generic events, finish.
 */
export class ClaudeCodeProvider implements Provider {
  readonly id = 'claude-code'
  readonly name = 'Claude Code'
  readonly type = 'cli' as const
  readonly capabilities: Capability[] = ['engineering']
  readonly description = 'Autonomous engineering — spawns the Claude Code CLI in a mission workspace'
  status: ProviderStatus = 'disconnected'

  /** Active sessions by mission id — the seat of future multi-project support. */
  private readonly sessions = new Map<string, ClaudeCodeSession>()

  constructor(private readonly options: ClaudeCodeProviderOptions) {}

  private get config(): ClaudeCodeConfig {
    return normalizeClaudeCodeConfig(this.options.config())
  }

  async connect(): Promise<void> {
    const health = await this.checkHealth()
    if (!health.ok) throw new Error(health.detail)
  }

  disconnect(): Promise<void> {
    for (const session of this.sessions.values()) session.cancel()
    return Promise.resolve()
  }

  /** Spawns `claude --version` to verify the executable is reachable. */
  checkHealth(): Promise<ClaudeCodeHealth> {
    return new Promise((resolve) => {
      let stdout = ''
      const done = (health: ClaudeCodeHealth) => {
        clearTimeout(timer)
        resolve(health)
      }
      const timer = setTimeout(
        () => done({ ok: false, detail: 'Health check timed out after 8s.' }),
        8000
      )
      try {
        this.options.launcher.launch(
          {
            command: this.config.executablePath,
            args: ['--version'],
            cwd: '.',
            env: this.config.env
          },
          {
            onStdout: (chunk) => {
              stdout += chunk
            },
            onStderr: () => {},
            onExit: (code) =>
              done(
                code === 0
                  ? { ok: true, detail: stdout.trim() || 'Claude Code detected' }
                  : { ok: false, detail: `"${this.config.executablePath} --version" exited with code ${code}.` }
              ),
            onError: (error) =>
              done({
                ok: false,
                detail: `Executable not found ("${this.config.executablePath}") — ${error.message}. Set the path in Settings → Providers → Claude Code.`
              })
          }
        )
      } catch (error) {
        done({ ok: false, detail: error instanceof Error ? error.message : String(error) })
      }
    })
  }

  activeSessionCount(): number {
    return [...this.sessions.values()].filter((s) => s.state === 'running').length
  }

  async *execute(request: ProviderExecutionRequest): AsyncGenerator<ProviderStreamEvent> {
    const config = this.config
    if (this.activeSessionCount() >= config.maxConcurrentSessions) {
      throw new Error(
        `Claude Code is already running ${config.maxConcurrentSessions} session(s). Raise the limit in Settings or wait for the current run.`
      )
    }

    const missionId = request.context.mission.id
    // Reconnect guard: a ghost session for this mission must not leak.
    this.sessions.get(missionId)?.cancel()

    const session = new ClaudeCodeSession(
      this.options.launcher,
      this.options.workspace,
      config,
      request
    )
    this.sessions.set(missionId, session)
    const onAbort = () => session.cancel()
    request.context.signal.addEventListener('abort', onAbort, { once: true })

    try {
      yield { type: 'status', status: 'working' }
      yield { type: 'message', text: 'Starting Claude Code…' }
      const { contextFiles } = session.prepare()
      yield {
        type: 'message',
        text: `Workspace ready (${contextFiles.length} context file${contextFiles.length === 1 ? '' : 's'}) — ${session.root}`
      }
      yield { type: 'progress', percent: 5, label: 'Workspace' }

      session.start()
      const stats: RunStats = { result: null, lastError: null }
      yield* this.streamSession(session, stats)

      if (request.context.signal.aborted || session.state === 'cancelled') {
        throw new MissionCancelledError()
      }
      if (session.state !== 'completed') {
        throw new Error(failureMessage(session, stats))
      }
      yield* this.collectArtifacts(session, stats)
    } finally {
      request.context.signal.removeEventListener('abort', onAbort)
      if (this.sessions.get(missionId) === session && session.state !== 'running') {
        this.sessions.delete(missionId)
      }
    }
  }

  private async *streamSession(
    session: ClaudeCodeSession,
    stats: RunStats
  ): AsyncGenerator<ProviderStreamEvent> {
    let toolCount = 0

    for await (const event of session.events) {
      switch (event.type) {
        case 'init':
          yield { type: 'message', text: `Claude Code session started (${event.model}). Loading project…` }
          break
        case 'text':
          yield { type: 'message', text: event.text }
          break
        case 'tool':
          toolCount++
          yield {
            type: 'progress',
            percent: Math.min(90, 8 + toolCount * 4),
            label: event.label
          }
          if (event.filePath) yield { type: 'message', text: event.label }
          break
        case 'file':
          if (event.kind === 'created') {
            yield { type: 'message', text: `${event.path} created` }
          }
          break
        case 'result':
          stats.result = event
          break
        case 'stderr':
          stats.lastError = event.text
          break
        case 'restarting':
          yield { type: 'message', text: event.reason }
          break
        case 'proc-error':
          stats.lastError = event.message
          yield { type: 'message', text: event.message }
          break
        case 'raw':
        case 'exit':
          break
      }
    }
  }

  private async *collectArtifacts(
    session: ClaudeCodeSession,
    stats: RunStats
  ): AsyncGenerator<ProviderStreamEvent> {
    const outputs = session.outputs()
    for (const entry of outputs) {
      const content = session.readOutput(entry.path)
      if (content === null) continue
      yield {
        type: 'artifact',
        artifact: {
          name: entry.path,
          kind: artifactKind(entry.path),
          description: 'Generated by Claude Code',
          content
        }
      }
    }

    const result = stats.result
    const parts = [
      `${outputs.length} file${outputs.length === 1 ? '' : 's'}`,
      result?.turns != null ? `${result.turns} turns` : null,
      result?.durationMs != null ? `${Math.round(result.durationMs / 1000)}s` : null,
      result?.costUsd != null ? `$${result.costUsd.toFixed(2)}` : null
    ].filter(Boolean)
    yield { type: 'progress', percent: 100, label: 'Build' }
    yield {
      type: 'message',
      text: `Finished. ${result?.summary ?? 'Build complete.'} (${parts.join(' · ')})`
    }
  }
}

function failureMessage(session: ClaudeCodeSession, stats: RunStats): string {
  const detail = stats.lastError ?? stats.result?.summary ?? 'Claude Code exited unexpectedly.'
  return `${detail} Workspace preserved for debugging: ${session.root}. Retry the mission, or check Settings → Providers → Claude Code.`
}

function artifactKind(path: string): ArtifactKind {
  if (/\.(tsx?|jsx?|css|html|json|py|swift)$/i.test(path)) return 'code'
  if (/\.(svg)$/i.test(path)) return 'image'
  if (/spec/i.test(path) && path.endsWith('.md')) return 'spec'
  if (/plan/i.test(path) && path.endsWith('.md')) return 'plan'
  return 'log'
}
