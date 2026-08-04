/**
 * The provider's internal event vocabulary — everything a Claude Code run
 * can surface, normalized from stream-json, stderr, the file watcher and
 * process lifecycle. The provider maps these to generic AgentEvents; no
 * Claude-specific type ever crosses into the runtime.
 */
export type ClaudeStreamEvent =
  | { type: 'init'; model: string }
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; label: string; filePath: string | null }
  | {
      type: 'result'
      ok: boolean
      summary: string
      durationMs: number | null
      costUsd: number | null
      turns: number | null
    }
  | { type: 'stderr'; text: string }
  | { type: 'raw'; line: string }
  | { type: 'file'; kind: 'created' | 'changed' | 'deleted'; path: string }
  | { type: 'restarting'; reason: string }
  | { type: 'exit'; code: number | null; signal: string | null }
  | { type: 'proc-error'; message: string }
