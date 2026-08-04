/**
 * Process abstraction. The core never touches child_process directly —
 * the host (Electron main) injects a ProcessLauncher; tests inject fakes.
 * All real process management therefore lives in the main process, and
 * the renderer is never blocked.
 */

export interface ProcessLaunchSpec {
  command: string
  args: string[]
  cwd: string
  env: Record<string, string>
}

export interface ProcessCallbacks {
  onStdout(chunk: string): void
  onStderr(chunk: string): void
  onExit(code: number | null, signal: string | null): void
  /** Spawn-level failures (executable missing, permissions…). */
  onError(error: Error): void
}

export interface ProcessHandle {
  readonly pid: number | null
  write(data: string): void
  closeStdin(): void
  kill(signal?: 'SIGTERM' | 'SIGKILL'): void
}

export interface ProcessLauncher {
  launch(spec: ProcessLaunchSpec, callbacks: ProcessCallbacks): ProcessHandle
}

/**
 * Unbounded async queue bridging callback-world (process events) into
 * async-generator-world (the provider's event stream).
 */
export class AsyncEventQueue<T> implements AsyncIterable<T> {
  private items: T[] = []
  private resolvers: ((result: IteratorResult<T>) => void)[] = []
  private closed = false

  push(item: T): void {
    if (this.closed) return
    const resolver = this.resolvers.shift()
    if (resolver) resolver({ value: item, done: false })
    else this.items.push(item)
  }

  end(): void {
    if (this.closed) return
    this.closed = true
    for (const resolver of this.resolvers.splice(0)) {
      resolver({ value: undefined as never, done: true })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        const item = this.items.shift()
        if (item !== undefined) return Promise.resolve({ value: item, done: false })
        if (this.closed) return Promise.resolve({ value: undefined as never, done: true })
        return new Promise((resolve) => this.resolvers.push(resolve))
      }
    }
  }
}

/** How an exited process should be interpreted. */
export function classifyExit(input: {
  code: number | null
  signal: string | null
  cancelled: boolean
  sawOutput: boolean
  uptimeMs: number
}): 'completed' | 'cancelled' | 'crashed' | 'crashed-early' {
  if (input.cancelled) return 'cancelled'
  if (input.code === 0) return 'completed'
  if (!input.sawOutput && input.uptimeMs < 5000) return 'crashed-early'
  return 'crashed'
}
