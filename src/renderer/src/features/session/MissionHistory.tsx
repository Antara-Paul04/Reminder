import { Fragment, useState } from 'react'
import { Archive, ArchiveRestore, Copy, FileText, Search } from 'lucide-react'
import type { MissionRecord, MissionReportData } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MISSION_STATUS_META } from '@/lib/agentMeta'
import { api } from '@/lib/api'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useRuntimeStore } from '@/stores/runtime'

type Filter = 'all' | 'completed' | 'failed' | 'archived'

/** Searchable mission history with report, replay, archive and compare. */
export function MissionHistory({ missions }: { missions: MissionRecord[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [report, setReport] = useState<{ title: string; markdown: string } | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compared, setCompared] = useState<MissionReportData[] | null>(null)

  const rows = missions.filter((m) => {
    if (filter === 'archived' ? !m.archived : m.archived) return false
    if (filter === 'completed' && m.status !== 'completed') return false
    if (filter === 'failed' && m.status !== 'failed') return false
    return m.title.toLowerCase().includes(query.toLowerCase())
  })

  const openReport = async (mission: MissionRecord) => {
    const stored = await api.missions.report(mission.id)
    setReport({
      title: mission.title,
      markdown: stored?.markdown ?? '_No report yet — reports are generated when a mission settles under the autonomous loop._'
    })
  }

  const toggleCompare = (id: string) => {
    setCompared(null)
    setCompareIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids.slice(-1), id]
    )
  }

  const runCompare = async () => {
    const reports = await Promise.all(compareIds.map((id) => api.missions.report(id)))
    setCompared(reports.flatMap((r) => (r ? [r.data] : [])))
  }

  const refresh = () => {
    const { projectId, init } = useRuntimeStore.getState()
    void init(projectId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-xs"
            placeholder="Search missions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {(['all', 'completed', 'failed', 'archived'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] capitalize transition-colors',
              filter === f
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {f}
          </button>
        ))}
        {compareIds.length === 2 && (
          <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => void runCompare()}>
            Compare
          </Button>
        )}
      </div>

      {compared && compared.length === 2 && (
        <CompareTable a={compared[0]} b={compared[1]} onClose={() => setCompared(null)} />
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1.5">
          {rows.map((mission) => (
            <div key={mission.id} className="group flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={compareIds.includes(mission.id)}
                onChange={() => toggleCompare(mission.id)}
                title="Select for compare"
                className="h-3 w-3 accent-[hsl(var(--primary))]"
              />
              <span className="min-w-0 flex-1 truncate text-xs">{mission.title}</span>
              <Badge className={cn('border-transparent text-[10px]', MISSION_STATUS_META[mission.status].badge)}>
                {MISSION_STATUS_META[mission.status].label}
              </Badge>
              <span className="w-14 shrink-0 text-right text-[10px] text-muted-foreground/70">
                {relativeTime(mission.updatedAt)}
              </span>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <IconButton title="Report" onClick={() => void openReport(mission)}>
                  <FileText className="h-3 w-3" />
                </IconButton>
                <IconButton
                  title="Replay (new run, same inputs)"
                  onClick={() => void api.missions.duplicate(mission.id).then(refresh)}
                >
                  <Copy className="h-3 w-3" />
                </IconButton>
                <IconButton
                  title={mission.archived ? 'Unarchive' : 'Archive'}
                  onClick={() =>
                    void api.missions.archive(mission.id, !mission.archived).then(refresh)
                  }
                >
                  {mission.archived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </IconButton>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-1 py-3 text-xs text-muted-foreground/70">No missions match.</p>
          )}
        </div>
      </ScrollArea>

      <Dialog open={report !== null} onOpenChange={(o) => !o && setReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mission report — {report?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
              {report?.markdown}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function IconButton({
  title,
  onClick,
  children
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

function CompareTable({
  a,
  b,
  onClose
}: {
  a: MissionReportData
  b: MissionReportData
  onClose: () => void
}) {
  const rows: [string, string, string][] = [
    ['Outcome', a.outcome, b.outcome],
    ['Iterations', String(a.iterations), String(b.iterations)],
    ['Duration', `${Math.round(a.durationMs / 60000)}m`, `${Math.round(b.durationMs / 60000)}m`],
    ['Quality', a.qualityScore?.toString() ?? '—', b.qualityScore?.toString() ?? '—'],
    ['Artifacts', String(a.artifacts.length), String(b.artifacts.length)],
    ['Files', String(a.filesGenerated.length), String(b.filesGenerated.length)]
  ]
  return (
    <div className="mb-2 shrink-0 rounded-md border bg-card p-2 text-[11px]">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">Compare</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
        <span />
        <span className="truncate text-muted-foreground">{a.title}</span>
        <span className="truncate text-muted-foreground">{b.title}</span>
        {rows.map(([label, va, vb]) => (
          <Fragment key={label}>
            <span className="text-muted-foreground/70">{label}</span>
            <span className="capitalize">{va}</span>
            <span className="capitalize">{vb}</span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
