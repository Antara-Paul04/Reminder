import { useState } from 'react'
import { Plus, Bot } from 'lucide-react'
import type { Project } from '@shared/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ProjectItem } from '@/features/projects/ProjectItem'
import { DeleteProjectDialog, RenameProjectDialog } from '@/features/projects/ProjectDialogs'
import { AGENT_STATUS_META } from '@/lib/agentMeta'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/projects'
import { useRuntimeStore } from '@/stores/runtime'
import { useUiStore } from '@/stores/ui'

export function Sidebar() {
  const { projects, activeProjectId, setActive } = useProjectStore()
  const setNewProjectOpen = useUiStore((s) => s.setNewProjectOpen)
  const agents = useRuntimeStore((s) => s.agents)
  const [renaming, setRenaming] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  return (
    <aside className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Projects
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNewProjectOpen(true)}
            >
              <Plus className="!size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New project · ⌘N</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2">
        <div className="flex flex-col gap-0.5 pb-3">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              active={project.id === activeProjectId}
              onSelect={() => setActive(project.id)}
              onRename={() => setRenaming(project)}
              onDelete={() => setDeleting(project)}
            />
          ))}
          {projects.length === 0 && (
            <p className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
              No projects yet. Create one to get started.
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-3 py-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> Agents
        </div>
        <div className="flex flex-col gap-1.5">
          {agents.map((agent) => {
            const meta = AGENT_STATUS_META[agent.status]
            return (
              <Tooltip key={agent.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                    <span className="truncate">{agent.name}</span>
                    <span
                      className={cn('ml-auto text-[10px] uppercase tracking-wide', meta.text)}
                    >
                      {meta.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px]">
                  {agent.description}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>

      <RenameProjectDialog project={renaming} onClose={() => setRenaming(null)} />
      <DeleteProjectDialog project={deleting} onClose={() => setDeleting(null)} />
    </aside>
  )
}
