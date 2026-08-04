import { spawn } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync } from 'fs'
import { app } from 'electron'
import { dirname, join, relative } from 'path'
import {
  normalizeClaudeCodeConfig,
  type ClaudeCodeConfig,
  type ClaudeCodeHealth
} from '../../core/providers/claude-code/ClaudeCodeConfig'
import { ClaudeCodeProvider } from '../../core/providers/claude-code/ClaudeCodeProvider'
import type {
  ProcessCallbacks,
  ProcessLauncher,
  ProcessLaunchSpec
} from '../../core/providers/claude-code/ClaudeCodeProcess'
import type { WorkspacePort } from '../../core/providers/claude-code/ClaudeCodeSession'
import { getSetting, setSetting } from '../db/settings'

const CONFIG_KEY = 'providers.claude-code.config'
let provider: ClaudeCodeProvider | null = null

export function getClaudeCodeConfig(): ClaudeCodeConfig {
  return normalizeClaudeCodeConfig(getSetting<Partial<ClaudeCodeConfig>>(CONFIG_KEY, {}))
}

export function setClaudeCodeConfig(partial: Partial<ClaudeCodeConfig>): ClaudeCodeConfig {
  const next = normalizeClaudeCodeConfig({ ...getClaudeCodeConfig(), ...partial })
  setSetting(CONFIG_KEY, next)
  return next
}

export function getClaudeCodeProvider(): ClaudeCodeProvider {
  if (!provider) throw new Error('Claude Code provider not initialised')
  return provider
}

export function checkClaudeCodeHealth(): Promise<ClaudeCodeHealth> {
  return getClaudeCodeProvider().checkHealth()
}

/** Node child_process implementation of the launcher port. */
const nodeLauncher: ProcessLauncher = {
  launch(spec: ProcessLaunchSpec, callbacks: ProcessCallbacks) {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: { ...process.env, ...spec.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => callbacks.onStdout(chunk))
    child.stderr.on('data', (chunk: string) => callbacks.onStderr(chunk))
    child.on('error', (error) => callbacks.onError(error))
    child.on('close', (code, signal) => callbacks.onExit(code, signal))
    return {
      get pid() {
        return child.pid ?? null
      },
      write: (data: string) => child.stdin.write(data),
      closeStdin: () => child.stdin.end(),
      kill: (signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM') => void child.kill(signal)
    }
  }
}

function workspaceRoot(): string {
  const configured = getClaudeCodeConfig().workspaceRoot
  return configured && configured.trim() ? configured : join(app.getPath('userData'), 'workspaces')
}

/** Node fs implementation of the workspace port. */
const nodeWorkspace: WorkspacePort = {
  prepare(sessionKey) {
    const root = join(workspaceRoot(), sessionKey)
    mkdirSync(root, { recursive: true })
    return root
  },

  writeFile(root, relativePath, content) {
    const abs = join(root, relativePath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  },

  listFiles(root) {
    const entries: { path: string; size: number }[] = []
    const visit = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.git') continue
        const abs = join(dir, name)
        const stats = statSync(abs)
        if (stats.isDirectory()) visit(abs)
        else entries.push({ path: relative(root, abs), size: stats.size })
      }
    }
    if (existsSync(root)) visit(root)
    return entries
  },

  readFile(root, relativePath, maxBytes) {
    try {
      const abs = join(root, relativePath)
      if (statSync(abs).size > maxBytes) return null
      const content = readFileSync(abs, 'utf8')
      return content.includes('\u0000') ? null : content // skip binaries
    } catch {
      return null
    }
  },

  watch(root, onChange) {
    const known = new Set(this.listFiles(root).map((f) => f.path))
    const watcher = watch(root, { recursive: true }, (_event, filename) => {
      if (!filename) return
      const rel = String(filename)
      const exists = existsSync(join(root, rel))
      if (!exists) {
        if (known.delete(rel)) onChange('deleted', rel)
      } else if (known.has(rel)) {
        onChange('changed', rel)
      } else {
        known.add(rel)
        onChange('created', rel)
      }
    })
    return () => watcher.close()
  }
}

export function buildClaudeCodeProvider(): ClaudeCodeProvider {
  provider = new ClaudeCodeProvider({
    launcher: nodeLauncher,
    workspace: nodeWorkspace,
    config: getClaudeCodeConfig
  })
  return provider
}
