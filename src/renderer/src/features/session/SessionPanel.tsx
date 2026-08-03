import { useEffect, useState } from 'react'
import { Bot, Sparkles, Terminal } from 'lucide-react'
import type { AgentInfo } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Claude session panel. Phase 1 renders the roster and the session chrome;
 * Phase 2 wires live agent sessions (streaming transcript, tool activity)
 * into this exact layout.
 */
export function SessionPanel() {
  const [agents, setAgents] = useState<AgentInfo[]>([])

  useEffect(() => {
    void api.agents.list().then(setAgents)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        {agents.map((agent) => (
          <button
            key={agent.id}
            disabled
            className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground',
              'cursor-not-allowed opacity-70'
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            {agent.name}
          </button>
        ))}
        <Badge variant="secondary" className="ml-auto">
          No active session
        </Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border bg-secondary/50">
          <Terminal className="h-[18px] w-[18px] text-muted-foreground" />
        </div>
        <p className="text-[13px] font-medium">Sessions arrive in Phase 2</p>
        <p className="max-w-[360px] text-xs leading-relaxed text-muted-foreground">
          This is where you&apos;ll watch the Creative Director, Engineer (Claude Code) and Design
          QA collaborate — streaming transcripts, tool activity and hand-offs between agents.
        </p>
        <div className="mt-5 grid max-w-md gap-2 text-left">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary">
                {agent.provider === 'claude-code' ? (
                  <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{agent.name}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{agent.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t p-3">
        <div className="flex items-center gap-2">
          <Input disabled placeholder="Message an agent… (Phase 2)" />
          <Button disabled size="default">
            <Bot className="!size-4" /> Run
          </Button>
        </div>
      </div>
    </div>
  )
}
