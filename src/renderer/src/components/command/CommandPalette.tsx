import {
  FolderKanban,
  LayoutPanelLeft,
  PanelLeft,
  PanelRight,
  Plus,
  Settings
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { useProjectStore } from '@/stores/projects'
import { useUiStore, WORKSPACE_TABS } from '@/stores/ui'

export function CommandPalette() {
  const { projects, activeProjectId, setActive } = useProjectStore()
  const ui = useUiStore()

  const close = () => ui.setPaletteOpen(false)

  const run = (action: () => void) => {
    close()
    action()
  }

  return (
    <CommandDialog open={ui.paletteOpen} onOpenChange={ui.setPaletteOpen}>
      <CommandInput placeholder="Type a command or search projects…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => ui.setNewProjectOpen(true))}>
            <Plus /> New project
            <Kbd className="ml-auto">⌘N</Kbd>
          </CommandItem>
          <CommandItem onSelect={() => run(ui.toggleSidebar)}>
            <PanelLeft /> Toggle sidebar
            <Kbd className="ml-auto">⌘B</Kbd>
          </CommandItem>
          <CommandItem onSelect={() => run(ui.toggleTimeline)}>
            <PanelRight /> Toggle activity timeline
            <Kbd className="ml-auto">⌘J</Kbd>
          </CommandItem>
          <CommandItem onSelect={() => run(() => ui.setView('settings'))}>
            <Settings /> Open settings
            <Kbd className="ml-auto">⌘,</Kbd>
          </CommandItem>
        </CommandGroup>

        {activeProjectId && (
          <CommandGroup heading="Go to panel">
            {WORKSPACE_TABS.map((tab, index) => (
              <CommandItem key={tab.id} onSelect={() => run(() => ui.setTab(tab.id))}>
                <LayoutPanelLeft /> {tab.label}
                <Kbd className="ml-auto">⌘{index + 1}</Kbd>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`project ${project.name}`}
                onSelect={() => run(() => setActive(project.id))}
              >
                <FolderKanban /> {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
