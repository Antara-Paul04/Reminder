import { useState } from 'react'
import { Check, CircleDot, ShieldCheck, Trash2 } from 'lucide-react'
import type { QaSeverity } from '@shared/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useProjectData } from '@/hooks/useProjectData'
import { api } from '@/lib/api'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { refreshTimeline } from '@/stores/timeline'

const SEVERITIES: { id: QaSeverity; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' }
]

const SEVERITY_VARIANT = { low: 'secondary', medium: 'warning', high: 'danger' } as const

export function QaPanel({ projectId }: { projectId: string }) {
  const { items, reload } = useProjectData(projectId, api.qa.list)
  const [content, setContent] = useState('')
  const [severity, setSeverity] = useState<QaSeverity>('medium')

  const mutate = async (action: () => Promise<unknown>) => {
    await action()
    await reload()
    refreshTimeline(projectId)
  }

  const submit = () =>
    content.trim() &&
    mutate(() => api.qa.add(projectId, content.trim(), severity)).then(() => setContent(''))

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b p-4">
        <Textarea
          rows={2}
          placeholder="File design feedback — spacing, type, motion, responsiveness…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
          }}
        />
        <div className="mt-2.5 flex items-center gap-1.5">
          {SEVERITIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeverity(s.id)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                severity === s.id
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {s.label}
            </button>
          ))}
          <Button size="sm" className="ml-auto" onClick={() => void submit()} disabled={!content.trim()}>
            File feedback
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No QA feedback"
          description="Track polish issues here. In Phase 2 the Design QA agent reviews builds against the spec and files feedback automatically."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 p-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 animate-fade-in',
                  item.status === 'resolved' && 'opacity-55'
                )}
              >
                <button
                  onClick={() =>
                    mutate(() =>
                      api.qa.setStatus(item.id, item.status === 'open' ? 'resolved' : 'open')
                    )
                  }
                  className={cn(
                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
                    item.status === 'resolved'
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                      : 'border-border text-transparent hover:border-emerald-500/50 hover:text-emerald-400/60'
                  )}
                  title={item.status === 'open' ? 'Mark resolved' : 'Reopen'}
                >
                  {item.status === 'resolved' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <CircleDot className="h-3 w-3" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[13px] leading-relaxed',
                      item.status === 'resolved' && 'line-through'
                    )}
                  >
                    {item.content}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
                <Badge variant={SEVERITY_VARIANT[item.severity]} className="shrink-0 capitalize">
                  {item.severity}
                </Badge>
                <button
                  onClick={() => mutate(() => api.qa.remove(item.id))}
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
