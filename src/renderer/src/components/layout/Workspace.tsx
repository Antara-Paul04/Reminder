import { useEffect, useRef, useState } from 'react'
import type { Project } from '@shared/types'
import { InspirationPanel } from '@/features/inspiration/InspirationPanel'
import { NotesPanel } from '@/features/notes/NotesPanel'
import { QaPanel } from '@/features/qa/QaPanel'
import { ReviewPanel } from '@/features/review/ReviewPanel'
import { SessionPanel } from '@/features/session/SessionPanel'
import { SpecPanel } from '@/features/spec/SpecPanel'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/projects'
import { refreshTimeline } from '@/stores/timeline'
import { useUiStore, WORKSPACE_TABS, type WorkspaceTab } from '@/stores/ui'

export function Workspace({ project }: { project: Project }) {
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)

  return (
    <div className="flex h-full min-w-0 flex-col bg-card/40">
      <WorkspaceHeader project={project} />

      <nav className="flex shrink-0 items-center gap-1 border-b px-3">
        {WORKSPACE_TABS.map((t, index) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            title={`⌘${index + 1}`}
            className={cn(
              'relative px-2.5 py-2 text-[13px] transition-colors',
              tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            <span
              className={cn(
                'absolute inset-x-2 -bottom-px h-px rounded-full bg-primary transition-opacity',
                tab === t.id ? 'opacity-100' : 'opacity-0'
              )}
            />
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        <TabContent tab={tab} projectId={project.id} />
      </div>
    </div>
  )
}

function TabContent({ tab, projectId }: { tab: WorkspaceTab; projectId: string }) {
  switch (tab) {
    case 'inspiration':
      return <InspirationPanel projectId={projectId} />
    case 'notes':
      return <NotesPanel projectId={projectId} />
    case 'spec':
      return <SpecPanel projectId={projectId} />
    case 'session':
      return <SessionPanel projectId={projectId} />
    case 'screenshots':
      return <ReviewPanel projectId={projectId} />
    case 'qa':
      return <QaPanel projectId={projectId} />
  }
}

function WorkspaceHeader({ project }: { project: Project }) {
  const updateBrief = useProjectStore((s) => s.updateBrief)
  const [brief, setBrief] = useState(project.brief)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset the draft only when switching projects — not on every store echo
  // of an autosave, which would clobber in-flight typing.
  useEffect(() => {
    setBrief(project.brief)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const scheduleSave = (value: string) => {
    setBrief(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void updateBrief(project.id, value).then(() => refreshTimeline(project.id))
    }, 800)
  }

  return (
    <div className="shrink-0 border-b px-4 pb-3 pt-4">
      <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
      <textarea
        rows={1}
        value={brief}
        onChange={(e) => scheduleSave(e.target.value)}
        placeholder="Add a short design brief — audience, mood, references…"
        className="mt-1 w-full resize-none bg-transparent text-[13px] leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:text-foreground"
      />
    </div>
  )
}
