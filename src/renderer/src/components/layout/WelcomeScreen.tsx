import { ArrowRight, Command as CommandIcon, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { relativeTime } from '@/lib/format'
import { useProjectStore } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'

export function WelcomeScreen() {
  const { projects, setActive } = useProjectStore()
  const { setNewProjectOpen, setPaletteOpen } = useUiStore()
  const recent = projects.slice(0, 5)

  return (
    <div className="flex h-full items-center justify-center bg-card/40 p-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border bg-gradient-to-b from-secondary to-background shadow-lg">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">AI Studio</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Orchestrate AI specialists to build premium Framer templates. Start with a brief and
          some inspiration — agents take it from there.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus className="!size-4" /> New project
            <Kbd className="ml-1 border-white/20 bg-white/10 text-white/80">⌘N</Kbd>
          </Button>
          <Button variant="secondary" onClick={() => setPaletteOpen(true)}>
            <CommandIcon className="!size-3.5" /> Command palette
            <Kbd className="ml-1">⌘K</Kbd>
          </Button>
        </div>

        {recent.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Recent projects
            </p>
            <div className="flex flex-col gap-1">
              {recent.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setActive(project.id)}
                  className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-accent/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.brief || 'No brief yet'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground/70">
                    {relativeTime(project.lastOpenedAt)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
