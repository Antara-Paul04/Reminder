import type { ProviderExecutionRequest } from '../types'
import { contextSections } from '../manual/PromptGenerator'
import { buildCliArgs, type ClaudeCodeConfig } from './ClaudeCodeConfig'
import type { ClaudeStreamEvent } from './ClaudeCodeEvents'
import { ClaudeCodeParser } from './ClaudeCodeParser'
import {
  AsyncEventQueue,
  classifyExit,
  type ProcessHandle,
  type ProcessLauncher
} from './ClaudeCodeProcess'

export type ClaudeSessionState =
  | 'preparing'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface WorkspaceEntry {
  path: string
  size: number
}

/** Filesystem port implemented by the host (Node fs in main, fakes in tests). */
export interface WorkspacePort {
  /** Create (or reuse) a workspace directory; returns its absolute path. */
  prepare(sessionKey: string): string
  writeFile(root: string, relativePath: string, content: string): void
  listFiles(root: string): WorkspaceEntry[]
  readFile(root: string, relativePath: string, maxBytes: number): string | null
  watch(
    root: string,
    onChange: (kind: 'created' | 'changed' | 'deleted', relativePath: string) => void
  ): () => void
}

/** Workspace paths owned by the studio, never treated as Claude's output. */
const INTERNAL_PATHS = /^(PROMPT\.md|mission\.json|context\/|logs\/|node_modules\/|\.git\/)/

/**
 * One Claude Code run for one mission step: prepares a structured
 * workspace (prompt + context artifacts + metadata), launches the CLI,
 * streams normalized events, watches the filesystem, and enforces
 * timeout/restart/cancel semantics. Everything is recorded in the
 * workspace for replay and debugging.
 */
export class ClaudeCodeSession {
  readonly events = new AsyncEventQueue<ClaudeStreamEvent>()
  state: ClaudeSessionState = 'preparing'
  root = ''
  readonly startedAt = Date.now()

  private readonly parser = new ClaudeCodeParser()
  private handle: ProcessHandle | null = null
  private stopWatch: (() => void) | null = null
  private timeout: ReturnType<typeof setTimeout> | null = null
  private rawLog: string[] = []
  private prompt = ''
  private sawOutput = false
  private restarted = false
  private cancelled = false
  private finished = false
  private launchedAt = 0

  constructor(
    private readonly launcher: ProcessLauncher,
    private readonly workspace: WorkspacePort,
    private readonly config: ClaudeCodeConfig,
    private readonly request: ProviderExecutionRequest
  ) {}

  /** Writes prompt, context artifacts and metadata into the workspace. */
  prepare(): { contextFiles: string[] } {
    const mission = this.request.context.mission
    const key = `${mission.id.slice(0, 8)}-attempt-${this.request.context.attempt + 1}`
    this.root = this.workspace.prepare(key)

    this.prompt = this.buildPrompt()
    this.workspace.writeFile(this.root, 'PROMPT.md', this.prompt)

    const contextFiles: string[] = []
    for (const artifact of this.request.context.artifacts) {
      if (artifact.kind === 'image') continue
      const rel = `context/${artifact.name}`
      this.workspace.writeFile(this.root, rel, artifact.content)
      contextFiles.push(rel)
    }

    this.workspace.writeFile(
      this.root,
      'mission.json',
      JSON.stringify(
        {
          missionId: mission.id,
          missionTitle: mission.title,
          projectId: mission.projectId,
          agentId: this.request.agentId,
          attempt: this.request.context.attempt,
          template: this.config.projectTemplate,
          createdAt: this.startedAt
        },
        null,
        2
      )
    )
    return { contextFiles }
  }

  start(): void {
    this.state = 'running'
    this.stopWatch = this.workspace.watch(this.root, (kind, path) => {
      if (INTERNAL_PATHS.test(path)) return
      this.events.push({ type: 'file', kind, path })
    })
    this.timeout = setTimeout(() => {
      this.events.push({
        type: 'proc-error',
        message: `Timed out after ${Math.round(this.config.timeoutMs / 60000)} minutes — process killed.`
      })
      this.fail()
    }, this.config.timeoutMs)
    this.launch()
  }

  private launch(): void {
    this.launchedAt = Date.now()
    this.handle = this.launcher.launch(
      {
        command: this.config.executablePath,
        args: buildCliArgs(this.config),
        cwd: this.root,
        env: this.config.env
      },
      {
        onStdout: (chunk) => {
          this.sawOutput = true
          this.rawLog.push(chunk)
          for (const event of this.parser.push(chunk)) this.events.push(event)
        },
        onStderr: (chunk) => {
          this.rawLog.push(`[stderr] ${chunk}`)
          if (chunk.trim()) this.events.push({ type: 'stderr', text: chunk.trim() })
        },
        onExit: (code, signal) => this.onExit(code, signal),
        onError: (error) => {
          this.events.push({ type: 'proc-error', message: describeSpawnError(error, this.config) })
          this.fail()
        }
      }
    )
    this.handle.write(this.prompt)
    this.handle.closeStdin()
  }

  private onExit(code: number | null, signal: string | null): void {
    if (this.finished) return
    for (const event of this.parser.flush()) this.events.push(event)
    const verdict = classifyExit({
      code,
      signal,
      cancelled: this.cancelled,
      sawOutput: this.sawOutput,
      uptimeMs: Date.now() - this.launchedAt
    })

    if (verdict === 'crashed-early' && this.config.autoReconnect && !this.restarted) {
      this.restarted = true
      this.events.push({
        type: 'restarting',
        reason: `Claude Code exited immediately (code ${code ?? signal ?? '?'}) — restarting once.`
      })
      this.launch()
      return
    }

    this.events.push({ type: 'exit', code, signal })
    this.state =
      verdict === 'completed' ? 'completed' : verdict === 'cancelled' ? 'cancelled' : 'failed'
    this.finish()
  }

  cancel(): void {
    if (this.state !== 'running' && this.state !== 'preparing') return
    this.cancelled = true
    if (this.handle) {
      this.handle.kill('SIGTERM')
    } else {
      this.state = 'cancelled'
      this.finish()
    }
  }

  /** Generated (non-internal) files currently in the workspace. */
  outputs(): WorkspaceEntry[] {
    return this.workspace
      .listFiles(this.root)
      .filter((entry) => !INTERNAL_PATHS.test(entry.path))
  }

  readOutput(relativePath: string, maxBytes = 64_000): string | null {
    return this.workspace.readFile(this.root, relativePath, maxBytes)
  }

  private fail(): void {
    this.state = 'failed'
    this.handle?.kill('SIGKILL')
    this.finish()
  }

  private finish(): void {
    if (this.finished) return
    this.finished = true
    if (this.timeout) clearTimeout(this.timeout)
    this.stopWatch?.()
    try {
      this.workspace.writeFile(this.root, 'logs/session.log', this.rawLog.join(''))
    } catch {
      // Log persistence must never mask the real outcome.
    }
    this.events.end()
  }

  private buildPrompt(): string {
    return [
      'You are the Engineer inside AI Studio, implementing a premium Framer template. ' +
        'Work in the CURRENT DIRECTORY. The context/ folder contains the creative ' +
        'specification and prior artifacts — read them first.',
      ...contextSections(this.request),
      '# TASK\n' +
        (this.request.context.attempt > 0
          ? 'Previous work was rejected by Design QA — read the QA feedback in context/ and rework the affected files.'
          : 'Implement the creative specification as real files in the current directory.') +
        ' Create clean, production-quality code. When done, write build-log.txt summarizing what you built, then stop.'
    ].join('\n\n')
  }
}

function describeSpawnError(error: Error, config: ClaudeCodeConfig): string {
  const message = error.message.includes('ENOENT')
    ? `Claude Code executable not found ("${config.executablePath}").`
    : `Failed to launch Claude Code: ${error.message}.`
  return `${message} Set the executable path in Settings → Providers → Claude Code, then retry the mission.`
}
