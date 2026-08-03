import { PanelLeft, PanelRight, Command as CommandIcon, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useActiveProject } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'

export function TitleBar() {
  const project = useActiveProject()
  const { toggleSidebar, toggleTimeline, setPaletteOpen } = useUiStore()

  return (
    <header className="drag-region flex h-12 shrink-0 items-center border-b bg-background pl-[84px] pr-3">
      <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <span className="font-semibold tracking-tight">AI Studio</span>
        {project && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="truncate text-muted-foreground">{project.name}</span>
          </>
        )}
      </div>

      <div className="no-drag ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setPaletteOpen(true)}
        >
          <CommandIcon className="!size-3.5" />
          <span className="text-xs">Search</span>
          <Kbd>⌘K</Kbd>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <PanelLeft className="!size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar · ⌘B</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTimeline}>
              <PanelRight className="!size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle activity · ⌘J</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
