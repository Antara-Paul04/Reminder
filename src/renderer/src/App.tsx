import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { CommandPalette } from '@/components/command/CommandPalette'
import { Sidebar } from '@/components/layout/Sidebar'
import { TitleBar } from '@/components/layout/TitleBar'
import { WelcomeScreen } from '@/components/layout/WelcomeScreen'
import { Workspace } from '@/components/layout/Workspace'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NewProjectDialog } from '@/features/projects/ProjectDialogs'
import { TimelinePanel } from '@/features/timeline/TimelinePanel'
import { useBlockWindowFileDrop, useShortcuts } from '@/hooks/useShortcuts'
import { useActiveProject, useProjectStore } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'

function ResizeHandle() {
  return (
    <PanelResizeHandle className="w-px bg-border transition-colors data-[resize-handle-state=drag]:bg-primary data-[resize-handle-state=hover]:bg-primary/50" />
  )
}

export default function App() {
  const load = useProjectStore((s) => s.load)
  const project = useActiveProject()
  const { sidebarOpen, timelineOpen } = useUiStore()

  useShortcuts()
  useBlockWindowFileDrop()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TitleBar />
        <PanelGroup direction="horizontal" autoSaveId="ai-studio-layout" className="min-h-0 flex-1">
          {sidebarOpen && (
            <>
              <Panel id="sidebar" order={1} defaultSize={17} minSize={13} maxSize={28}>
                <Sidebar />
              </Panel>
              <ResizeHandle />
            </>
          )}

          <Panel id="main" order={2} minSize={40}>
            {project ? <Workspace project={project} /> : <WelcomeScreen />}
          </Panel>

          {timelineOpen && project && (
            <>
              <ResizeHandle />
              <Panel id="timeline" order={3} defaultSize={21} minSize={15} maxSize={32}>
                <TimelinePanel projectId={project.id} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      <CommandPalette />
      <NewProjectDialog />
    </TooltipProvider>
  )
}
