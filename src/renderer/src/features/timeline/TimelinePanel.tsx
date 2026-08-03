import { useEffect } from 'react'
import {
  Activity,
  Camera,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  ShieldCheck,
  StickyNote,
  type LucideIcon
} from 'lucide-react'
import type { TimelineEvent } from '@shared/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { dayLabel, timeOfDay } from '@/lib/format'
import { useTimelineStore } from '@/stores/timeline'

const TYPE_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  inspiration: ImageIcon,
  note: StickyNote,
  spec: FileText,
  screenshot: Camera,
  qa: ShieldCheck
}

function iconFor(event: TimelineEvent): LucideIcon {
  return TYPE_ICONS[event.type.split('.')[0]] ?? Activity
}

function groupByDay(events: TimelineEvent[]): [string, TimelineEvent[]][] {
  const groups = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const label = dayLabel(event.createdAt)
    const bucket = groups.get(label)
    if (bucket) bucket.push(event)
    else groups.set(label, [event])
  }
  return Array.from(groups.entries())
}

export function TimelinePanel({ projectId }: { projectId: string }) {
  const { events, refresh } = useTimelineStore()

  useEffect(() => {
    void refresh(projectId)
  }, [projectId, refresh])

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Activity
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-3">
          {groupByDay(events).map(([label, group]) => (
            <div key={label}>
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">{label}</p>
              <div className="flex flex-col">
                {group.map((event) => {
                  const Icon = iconFor(event)
                  return (
                    <div key={event.id} className="group relative flex gap-2.5 pb-3 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <div className="z-10 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-secondary">
                          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <div className="absolute top-6 h-full w-px bg-border group-last:hidden" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs leading-snug text-foreground/90">{event.message}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {event.actor === 'you' ? 'You' : event.actor} · {timeOfDay(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="px-1 py-4 text-xs leading-relaxed text-muted-foreground">
              Activity from you and your agents will appear here.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
