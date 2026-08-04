import { Badge } from '@/components/ui/badge'
import { AGENT_STATUS_META } from '@/lib/agentMeta'
import { cn } from '@/lib/utils'
import { useRuntimeStore } from '@/stores/runtime'

/** Read-only view of each agent's configuration, preferences and memory. */
export function AgentsSection() {
  const agents = useRuntimeStore((s) => s.agents)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Each agent carries its own preferences, configuration and memory. Providers may honour
        these; memory accumulates as agents work across missions.
      </p>
      {agents.map((agent) => {
        const meta = AGENT_STATUS_META[agent.status]
        return (
          <div key={agent.id} className="rounded-lg border bg-card px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                <span className={cn('text-xs', meta.text)}>{meta.label}</span>
              </div>
            </div>

            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="capitalize">{agent.role}</dd>

              <dt className="text-muted-foreground">Provider</dt>
              <dd>{agent.providerName}</dd>

              <dt className="text-muted-foreground">Preferences</dt>
              <dd className="flex flex-wrap gap-1">
                {Object.entries(agent.preferences).length > 0 ? (
                  Object.entries(agent.preferences).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="font-mono text-[10px]">
                      {key}: {String(value)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </dd>

              <dt className="text-muted-foreground">Configuration</dt>
              <dd className="font-mono text-[11px] text-muted-foreground">
                {Object.keys(agent.configuration).length > 0
                  ? JSON.stringify(agent.configuration)
                  : '—'}
              </dd>

              <dt className="text-muted-foreground">Memory</dt>
              <dd className="text-muted-foreground">
                {agent.memoryCount > 0
                  ? `${agent.memoryCount} entr${agent.memoryCount === 1 ? 'y' : 'ies'}`
                  : 'Empty — agents accumulate learnings across missions'}
              </dd>
            </dl>
          </div>
        )
      })}
    </div>
  )
}
