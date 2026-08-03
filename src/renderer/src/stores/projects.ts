import { create } from 'zustand'
import type { Project } from '@shared/types'
import { api } from '@/lib/api'

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  loaded: boolean
  load: () => Promise<void>
  create: (name: string, brief: string) => Promise<Project>
  rename: (id: string, name: string) => Promise<void>
  updateBrief: (id: string, brief: string) => Promise<void>
  remove: (id: string) => Promise<void>
  setActive: (id: string | null) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProjectId: null,
  loaded: false,

  load: async () => {
    const projects = await api.projects.list()
    set((state) => ({
      projects,
      loaded: true,
      activeProjectId: projects.some((p) => p.id === state.activeProjectId)
        ? state.activeProjectId
        : null
    }))
  },

  create: async (name, brief) => {
    const project = await api.projects.create(name, brief)
    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: project.id
    }))
    return project
  },

  rename: async (id, name) => {
    const project = await api.projects.rename(id, name)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? project : p))
    }))
  },

  updateBrief: async (id, brief) => {
    const project = await api.projects.updateBrief(id, brief)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? project : p))
    }))
  },

  remove: async (id) => {
    await api.projects.remove(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
    }))
  },

  setActive: (id) => {
    set({ activeProjectId: id })
    if (id) void api.projects.touch(id)
  }
}))

export function useActiveProject(): Project | null {
  const { projects, activeProjectId } = useProjectStore()
  return projects.find((p) => p.id === activeProjectId) ?? null
}
