import { useEffect, useRef, useState } from 'react'
import { Activity, Terminal } from 'lucide-react'
import type { ClaudeCodeConfig, ClaudeCodeHealth } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

/** Configuration + health card for the Claude Code provider. */
export function ClaudeCodeSettings() {
  const [config, setConfig] = useState<ClaudeCodeConfig | null>(null)
  const [health, setHealth] = useState<ClaudeCodeHealth | null>(null)
  const [checking, setChecking] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void api.claudeCode.getConfig().then(setConfig)
  }, [])

  const patch = (partial: Partial<ClaudeCodeConfig>) => {
    setConfig((current) => (current ? { ...current, ...partial } : current))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void api.claudeCode.setConfig(partial).then(setConfig)
    }, 600)
  }

  const checkHealth = async () => {
    setChecking(true)
    try {
      setHealth(await api.claudeCode.health())
    } finally {
      setChecking(false)
    }
  }

  if (!config) return null

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[13px] font-medium">Claude Code</p>
            <p className="text-xs text-muted-foreground">CLI provider configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {health && (
            <Badge variant={health.ok ? 'success' : 'danger'} className="max-w-[260px] truncate">
              {health.ok ? `Healthy · ${health.detail}` : health.detail}
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={() => void checkHealth()} disabled={checking}>
            <Activity className="!size-3.5" /> {checking ? 'Checking…' : 'Check health'}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <Field label="Executable path">
          <Input
            value={config.executablePath}
            onChange={(e) => patch({ executablePath: e.target.value })}
            placeholder="claude"
          />
        </Field>
        <Field label="Working directory" hint="Mission workspaces root; empty = app data folder">
          <Input
            value={config.workspaceRoot ?? ''}
            onChange={(e) => patch({ workspaceRoot: e.target.value || null })}
            placeholder="~/Library/Application Support/AI Studio/workspaces"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default project template">
            <Input
              value={config.projectTemplate}
              onChange={(e) => patch({ projectTemplate: e.target.value })}
            />
          </Field>
          <Field label="Max concurrent sessions">
            <Input
              type="number"
              min={1}
              value={config.maxConcurrentSessions}
              onChange={(e) => patch({ maxConcurrentSessions: Number(e.target.value) || 1 })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Session timeout (minutes)">
            <Input
              type="number"
              min={1}
              value={Math.round(config.timeoutMs / 60000)}
              onChange={(e) => patch({ timeoutMs: (Number(e.target.value) || 10) * 60000 })}
            />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-[13px]">
            <input
              type="checkbox"
              checked={config.autoReconnect}
              onChange={(e) => patch({ autoReconnect: e.target.checked })}
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
            />
            Auto-restart on immediate crash
          </label>
        </div>
        <Field label="Environment variables" hint="KEY=VALUE, one per line">
          <textarea
            rows={2}
            className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 font-mono text-xs shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue={Object.entries(config.env)
              .map(([k, v]) => `${k}=${v}`)
              .join('\n')}
            onChange={(e) => patch({ env: parseEnv(e.target.value) })}
            placeholder="ANTHROPIC_MODEL=claude-sonnet-5"
          />
        </Field>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1">
      <label className="text-xs text-muted-foreground">
        {label}
        {hint ? <span className="text-muted-foreground/60"> — {hint}</span> : null}
      </label>
      {children}
    </div>
  )
}

function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const index = line.indexOf('=')
    if (index > 0) env[line.slice(0, index).trim()] = line.slice(index + 1).trim()
  }
  return env
}
