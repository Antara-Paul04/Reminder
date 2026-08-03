import { create } from 'zustand'

export type WorkspaceTab =
  | 'inspiration'
  | 'notes'
  | 'spec'
  | 'session'
  | 'screenshots'
  | 'qa'

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'notes', label: 'Notes' },
  { id: 'spec', label: 'Spec' },
  { id: 'session', label: 'Session' },
  { id: 'screenshots', label: 'Screenshots' },
  { id: 'qa', label: 'QA' }
]

interface UiState {
  tab: WorkspaceTab
  sidebarOpen: boolean
  timelineOpen: boolean
  paletteOpen: boolean
  newProjectOpen: boolean
  setTab: (tab: WorkspaceTab) => void
  toggleSidebar: () => void
  toggleTimeline: () => void
  setPaletteOpen: (open: boolean) => void
  setNewProjectOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  tab: 'inspiration',
  sidebarOpen: true,
  timelineOpen: true,
  paletteOpen: false,
  newProjectOpen: false,
  setTab: (tab) => set({ tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTimeline: () => set((s) => ({ timelineOpen: !s.timelineOpen })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setNewProjectOpen: (newProjectOpen) => set({ newProjectOpen })
}))
