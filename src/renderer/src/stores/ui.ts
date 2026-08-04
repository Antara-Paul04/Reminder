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
  { id: 'screenshots', label: 'Review' },
  { id: 'qa', label: 'QA' }
]

export type AppView = 'workspace' | 'settings'

interface UiState {
  view: AppView
  tab: WorkspaceTab
  sidebarOpen: boolean
  timelineOpen: boolean
  paletteOpen: boolean
  newProjectOpen: boolean
  setView: (view: AppView) => void
  setTab: (tab: WorkspaceTab) => void
  toggleSidebar: () => void
  toggleTimeline: () => void
  setPaletteOpen: (open: boolean) => void
  setNewProjectOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  view: 'workspace',
  tab: 'inspiration',
  sidebarOpen: true,
  timelineOpen: true,
  paletteOpen: false,
  newProjectOpen: false,
  setView: (view) => set({ view }),
  setTab: (tab) => set({ tab, view: 'workspace' }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTimeline: () => set((s) => ({ timelineOpen: !s.timelineOpen })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setNewProjectOpen: (newProjectOpen) => set({ newProjectOpen })
}))
