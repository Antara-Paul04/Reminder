import { useEffect } from 'react'
import { useUiStore, WORKSPACE_TABS } from '@/stores/ui'
import { useProjectStore } from '@/stores/projects'

/**
 * Global keyboard shortcuts:
 *  ⌘K command palette · ⌘N new project · ⌘B sidebar · ⌘J timeline · ⌘1–6 tabs
 */
export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return

      const ui = useUiStore.getState()
      const key = event.key.toLowerCase()

      if (key === 'k') {
        event.preventDefault()
        ui.setPaletteOpen(!ui.paletteOpen)
        return
      }
      if (key === 'n') {
        event.preventDefault()
        ui.setNewProjectOpen(true)
        return
      }
      if (key === 'b') {
        event.preventDefault()
        ui.toggleSidebar()
        return
      }
      if (key === 'j') {
        event.preventDefault()
        ui.toggleTimeline()
        return
      }
      if (key === ',') {
        event.preventDefault()
        ui.setView(ui.view === 'settings' ? 'workspace' : 'settings')
        return
      }

      const tabIndex = Number.parseInt(key, 10) - 1
      if (tabIndex >= 0 && tabIndex < WORKSPACE_TABS.length) {
        if (!useProjectStore.getState().activeProjectId) return
        event.preventDefault()
        ui.setTab(WORKSPACE_TABS[tabIndex].id)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/** Blocks the OS default of navigating when a file is dropped outside a dropzone. */
export function useBlockWindowFileDrop(): void {
  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])
}
