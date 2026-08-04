import type { ClaudeStreamEvent } from './ClaudeCodeEvents'

/**
 * Converts Claude Code's `--output-format stream-json` NDJSON into
 * normalized ClaudeStreamEvents. Line-buffered: feed it raw chunks,
 * receive complete events.
 */
export class ClaudeCodeParser {
  private buffer = ''

  push(chunk: string): ClaudeStreamEvent[] {
    this.buffer += chunk
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    return lines.flatMap((line) => this.parseLine(line))
  }

  flush(): ClaudeStreamEvent[] {
    const rest = this.buffer.trim()
    this.buffer = ''
    return rest ? this.parseLine(rest) : []
  }

  private parseLine(line: string): ClaudeStreamEvent[] {
    const trimmed = line.trim()
    if (!trimmed) return []
    if (!trimmed.startsWith('{')) return [{ type: 'raw', line: trimmed }]

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      return [{ type: 'raw', line: trimmed }]
    }

    switch (payload.type) {
      case 'system':
        return payload.subtype === 'init'
          ? [{ type: 'init', model: String(payload.model ?? 'unknown') }]
          : []
      case 'assistant':
        return this.parseAssistant(payload)
      case 'result':
        return [this.parseResult(payload)]
      default:
        return [] // tool results / user turns are noise at this level
    }
  }

  private parseAssistant(payload: Record<string, unknown>): ClaudeStreamEvent[] {
    const message = payload.message as { content?: unknown } | undefined
    if (!Array.isArray(message?.content)) return []

    return (message.content as Record<string, unknown>[]).flatMap(
      (block): ClaudeStreamEvent[] => {
        if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
          return [{ type: 'text', text: block.text.trim() }]
        }
        if (block.type === 'tool_use') {
          const name = String(block.name ?? 'tool')
          const input = (block.input ?? {}) as Record<string, unknown>
          return [{ type: 'tool', name, ...describeTool(name, input) }]
        }
        return []
      }
    )
  }

  private parseResult(payload: Record<string, unknown>): ClaudeStreamEvent {
    const ok = payload.subtype === 'success' && payload.is_error !== true
    const summary =
      typeof payload.result === 'string' && payload.result.trim()
        ? payload.result.trim()
        : ok
          ? 'Run finished.'
          : `Run failed (${String(payload.subtype ?? 'unknown')})`
    return {
      type: 'result',
      ok,
      summary,
      durationMs: numberOrNull(payload.duration_ms),
      costUsd: numberOrNull(payload.total_cost_usd),
      turns: numberOrNull(payload.num_turns)
    }
  }
}

function describeTool(
  name: string,
  input: Record<string, unknown>
): { label: string; filePath: string | null } {
  const filePath = typeof input.file_path === 'string' ? input.file_path : null
  const base = filePath ? filePath.split('/').pop() : null

  switch (name) {
    case 'Write':
      return { label: `Writing ${base ?? 'file'}`, filePath }
    case 'Edit':
    case 'MultiEdit':
      return { label: `Editing ${base ?? 'file'}`, filePath }
    case 'Read':
      return { label: `Reading ${base ?? 'file'}`, filePath }
    case 'Bash': {
      const command = typeof input.command === 'string' ? input.command : ''
      const short = command.length > 60 ? `${command.slice(0, 57)}…` : command
      return { label: short ? `Running ${short}` : 'Running command', filePath: null }
    }
    case 'Glob':
    case 'Grep':
      return { label: 'Searching the workspace', filePath: null }
    case 'TodoWrite':
      return { label: 'Planning next steps', filePath: null }
    default:
      return { label: `Using ${name}`, filePath }
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
