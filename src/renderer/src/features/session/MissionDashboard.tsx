import { useEffect, useState } from 'react'
import type { MissionMetricsSnapshot, MissionRecord } from '@shared/types'
import { cn } from '@/lib/utils'
import { useRuntimeStore } from '@/stores/runtime'

/** CI-style live telemetry tiles for the active mission. */
export function MissionDashboard({
  mission,
  metrics
}: {
  mission: MissionRecord
  metrics: MissionMetricsSnapshot
}) {
  const agents = useRuntimeStore((s) => s.agents)
  const [, tick] = useState(0)

  const live = mission.status === 'running' || mission.status === 'paused'
  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [live])

  const elapsed = live ? Date.now() - metrics.startedAt : metrics.elapsedMs
  const agentName = metrics.currentAgentId
    ? (agents.find((a) => a.id === metrics.currentAgentId)?.name ?? metrics.currentAgentId)
    : '—'

  const tiles: { label: string; value: string; accent?: 'ok' | 'warn' | 'bad' }[] = [
    { label: 'Agent', value: live ? agentName : 'Done' },
    { label: 'Task', value: (live && metrics.currentTask) || '—' },
    { label: 'Iteration', value: String(metrics.iteration) },
    { label: 'Elapsed', value: formatMs(elapsed) },
    { label: 'Artifacts', value: String(metrics.artifactsCreated) },
    { label: 'Files', value: String(metrics.filesChanged) },
    {
      label: 'Health',
      value: metrics.health,
      accent: metrics.health === 'healthy' ? 'ok' : metrics.health === 'degraded' ? 'warn' : 'bad'
    },
    {
      label: 'ETA',
      value:
        !live || metrics.estimatedRemainingMs === null
          ? '—'
          : `~${formatMs(metrics.estimatedRemainingMs)}`
    }
  ]

  return (
    <div className="grid shrink-0 grid-cols-4 gap-1.5 border-b px-4 py-2.5 lg:grid-cols-8">
      {tiles.map((tile) => (
        <div key={tile.label} className="min-w-0 rounded-md border bg-card/60 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
            {tile.label}
          </p>
          <p
            className={cn(
              'truncate text-[11px] font-medium capitalize',
              tile.accent === 'ok' && 'text-emerald-300',
              tile.accent === 'warn' && 'text-amber-300',
              tile.accent === 'bad' && 'text-red-300'
            )}
            title={tile.value}
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function formatMs(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}
