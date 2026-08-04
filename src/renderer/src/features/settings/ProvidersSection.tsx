import { Check } from 'lucide-react'
import type { AgentDescriptor, ProviderDescriptor } from '@shared/types'
import { ROLE_CAPABILITY } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useRuntimeStore } from '@/stores/runtime'
import { ClaudeCodeSettings } from './ClaudeCodeSettings'

const TYPE_LABELS: Record<ProviderDescriptor['type'], string> = {
  simulator: 'Built-in',
  manual: 'Manual',
  api: 'API',
  cli: 'CLI'
}

/** Per-agent provider selection: Simulator live, the roadmap greyed out. */
export function ProvidersSection() {
  const { agents, providers, selectProvider } = useRuntimeStore()

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Agents are responsibilities; providers are implementations. Changing a provider is pure
        configuration — no code, no restart. Greyed-out providers are on the roadmap.
      </p>
      {agents.map((agent) => (
        <AgentProviderCard
          key={agent.id}
          agent={agent}
          providers={providers.filter((p) =>
            p.capabilities.includes(ROLE_CAPABILITY[agent.role])
          )}
          onSelect={(providerId) => void selectProvider(agent.id, providerId)}
        />
      ))}

      <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Provider configuration
      </p>
      <ClaudeCodeSettings />
    </div>
  )
}

function AgentProviderCard({
  agent,
  providers,
  onSelect
}: {
  agent: AgentDescriptor
  providers: ProviderDescriptor[]
  onSelect: (providerId: string) => void
}) {
  const assigned = providers.find((p) => p.id === agent.provider)
  const sorted = [...providers].sort((a, b) => Number(a.comingSoon) - Number(b.comingSoon))

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-[13px] font-medium">{agent.name}</p>
          <p className="text-xs text-muted-foreground">{agent.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{assigned?.name ?? agent.provider}</span>
          <Badge
            variant={assigned?.status === 'connected' ? 'success' : 'secondary'}
            className="capitalize"
          >
            {assigned?.status ?? 'unknown'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col p-1.5">
        {sorted.map((provider) => {
          const selected = provider.id === agent.provider
          const disabled = provider.comingSoon
          return (
            <button
              key={provider.id}
              disabled={disabled}
              onClick={() => !selected && onSelect(provider.id)}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                disabled
                  ? 'cursor-not-allowed opacity-45'
                  : selected
                    ? 'bg-accent'
                    : 'hover:bg-accent/60'
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                )}
              >
                {selected && <Check className="h-2.5 w-2.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">{provider.name}</span>
                  <span className="rounded border border-border px-1 py-px text-[10px] uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABELS[provider.type]}
                  </span>
                  {provider.comingSoon && (
                    <Badge variant="outline" className="text-[10px]">
                      Coming soon
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{provider.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
