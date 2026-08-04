/**
 * User-facing configuration for the Claude Code provider, persisted by the
 * host (settings table) and editable in Settings → Providers.
 */
export interface ClaudeCodeConfig {
  /** Executable name or absolute path. */
  executablePath: string
  /** Root directory for mission workspaces; null → host default. */
  workspaceRoot: string | null
  /** Scaffold hint written into workspace metadata (future templates). */
  projectTemplate: string
  /** Restart once if the process dies immediately after launch. */
  autoReconnect: boolean
  maxConcurrentSessions: number
  /** Hard ceiling on a single session; the process is killed after this. */
  timeoutMs: number
  /** Extra CLI arguments appended to the defaults. */
  extraArgs: string[]
  /** Extra environment variables for the child process. */
  env: Record<string, string>
}

export const DEFAULT_CLAUDE_CODE_CONFIG: ClaudeCodeConfig = {
  executablePath: 'claude',
  workspaceRoot: null,
  projectTemplate: 'blank',
  autoReconnect: true,
  maxConcurrentSessions: 1,
  timeoutMs: 10 * 60_000,
  extraArgs: [],
  env: {}
}

export function normalizeClaudeCodeConfig(partial: Partial<ClaudeCodeConfig>): ClaudeCodeConfig {
  const merged = { ...DEFAULT_CLAUDE_CODE_CONFIG, ...partial }
  merged.executablePath = merged.executablePath.trim() || 'claude'
  merged.maxConcurrentSessions = Math.max(1, Math.floor(merged.maxConcurrentSessions) || 1)
  merged.timeoutMs = Math.max(60_000, merged.timeoutMs || DEFAULT_CLAUDE_CODE_CONFIG.timeoutMs)
  return merged
}

/**
 * Print-mode streaming invocation. The prompt travels over stdin;
 * `acceptEdits` lets Claude write files inside the sandboxed workspace
 * without interactive permission prompts.
 */
export function buildCliArgs(config: ClaudeCodeConfig): string[] {
  return [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    ...config.extraArgs
  ]
}

export interface ClaudeCodeHealth {
  ok: boolean
  /** Version string when ok; actionable error message when not. */
  detail: string
}
