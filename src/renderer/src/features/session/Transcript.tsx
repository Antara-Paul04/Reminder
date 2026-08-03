import { useEffect, useRef } from 'react'
import { AlertTriangle, FileBox, Sparkles, Terminal } from 'lucide-react'
import type { AgentDescriptor } from '@shared/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { timeOfDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TranscriptLine } from '@/stores/runtime'

/** Streaming mission transcript with autoscroll. */
export function Transcript({
  lines,
  agents
}: {
  lines: TranscriptLine[]
  agents: AgentDescriptor[]
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lines.length])

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? 'AI Studio'
  const isEngineer = (id: string) => agents.find((a) => a.id === id)?.role === 'engineer'

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-2.5 p-4">
        {lines.map((line) => (
          <div key={line.id} className="flex items-start gap-2.5 animate-fade-in">
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                line.kind === 'error' ? 'bg-red-500/15' : 'bg-secondary'
              )}
            >
              {line.kind === 'error' ? (
                <AlertTriangle className="h-3 w-3 text-red-400" />
              ) : line.kind === 'artifact' ? (
                <FileBox className="h-3 w-3 text-primary" />
              ) : isEngineer(line.agentId) ? (
                <Terminal className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Sparkles className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-xs font-medium',
                    line.kind === 'error' ? 'text-red-300' : 'text-foreground/90'
                  )}
                >
                  {line.kind === 'error' ? 'Mission' : agentName(line.agentId)}
                </span>
                <span className="text-[10px] text-muted-foreground/60">{timeOfDay(line.at)}</span>
              </div>
              <p
                className={cn(
                  'mt-0.5 text-[13px] leading-relaxed',
                  line.kind === 'artifact'
                    ? 'font-mono text-xs text-primary'
                    : line.kind === 'error'
                      ? 'text-red-300/90'
                      : 'text-muted-foreground'
                )}
              >
                {line.kind === 'artifact' ? `created ${line.text}` : line.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
