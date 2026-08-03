import { create } from 'zustand'
import type { TimelineEvent } from '@shared/types'
import { api } from '@/lib/api'

interface TimelineState {
  events: TimelineEvent[]
  projectId: string | null
  refresh: (projectId: string) => Promise<void>
  clear: () => void
}

/**
 * Central activity feed. Any panel that mutates project data calls
 * `refreshTimeline()` afterwards so the rail stays live.
 */
export const useTimelineStore = create<TimelineState>((set) => ({
  events: [],
  projectId: null,
  refresh: async (projectId) => {
    const events = await api.timeline.list(projectId)
    set({ events, projectId })
  },
  clear: () => set({ events: [], projectId: null })
}))

export function refreshTimeline(projectId: string): void {
  void useTimelineStore.getState().refresh(projectId)
}
