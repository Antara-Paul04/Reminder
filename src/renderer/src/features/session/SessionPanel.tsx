import { Bot, Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AGENT_STATUS_META, MISSION_STATUS_META } from '@/lib/agentMeta'
import { cn } from '@/lib/utils'
import { useRuntimeStore } from '@/stores/runtime'
import { MissionControls } from './MissionControls'
import { MissionProgress } from './MissionProgress'
import { Transcript } from './Transcript'

/**
 * Live mission control. Fully event-driven: everything here re-renders off
 * runtime events, with no knowledge of which provider powers an agent.
 */
export function SessionPanel({ projectId }: { projectId: string }) {
  const { agents, missions, transcripts, progress } = useRuntimeStore()
  const mission = missions[0] ?? null
  const lines = mission ? (transcripts[mission.id] ?? []) : []

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        {agents.map((agent) => {
          const meta = AGENT_STATUS_META[agent.status]
          const agentProgress = progress[agent.id]
          const active = agent.status !== 'idle' && agent.status !== 'complete'
          return (
            <Tooltip key={agent.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                    active ? 'border-border bg-secondary/60 text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                  <span>{agent.name}</span>
                  <span className={cn('text-[10px] uppercase tracking-wide', meta.text)}>
                    {agentProgress && agent.status === 'working'
                      ? `${Math.round(agentProgress.percent)}%`
                      : meta.label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                {agent.description} · provider: {agent.provider}
              </TooltipContent>
            </Tooltip>
          )
        })}
        {mission && (
          <Badge className={cn('ml-auto border-transparent', MISSION_STATUS_META[mission.status].badge)}>
            {MISSION_STATUS_META[mission.status].label}
          </Badge>
        )}
      </div>

      {mission && (
        <div className="shrink-0 border-b px-4 pb-3 pt-3">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p className="truncate text-[13px] font-medium">{mission.title}</p>
          </div>
          <MissionProgress mission={mission} />
        </div>
      )}

      {mission ? (
        lines.length > 0 ? (
          <Transcript lines={lines} agents={agents} />
        ) : (
          <IdleTranscriptNotice />
        )
      ) : (
        <EmptySession />
      )}

      <div className="shrink-0 border-t p-3">
        <div className="flex items-center gap-2">
          <MissionControls projectId={projectId} mission={mission} />
          <Input
            disabled
            className="flex-1"
            placeholder="Direct messages to agents arrive with live providers"
          />
        </div>
      </div>
    </div>
  )
}

function EmptySession() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border bg-secondary/50">
        <Rocket className="h-[18px] w-[18px] text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium">No missions yet</p>
      <p className="max-w-[360px] text-xs leading-relaxed text-muted-foreground">
        Start a mission and watch the Creative Director, Engineer and Design QA take your brief
        from research to a reviewed build — every step streams here as it happens.
      </p>
    </div>
  )
}

function IdleTranscriptNotice() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
      <Bot className="mb-2 h-5 w-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        Transcript will stream here. Past missions keep their results in Specs, Screenshots, QA
        and the activity timeline.
      </p>
    </div>
  )
}
