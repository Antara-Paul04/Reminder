import { create } from 'zustand'
import type {
  Annotation,
  AnnotationInput,
  CategoryScore,
  IterationRecord,
  ReviewRecommendation,
  ReviewSessionRecord,
  ScreenshotArtifactMeta,
  ScreenshotRole
} from '@shared/types'
import { api } from '@/lib/api'
import { isImageFile, toFileUpload } from '@/lib/files'

export type ComparisonMode = 'side-by-side' | 'slider'

interface ReviewState {
  projectId: string | null
  screenshots: ScreenshotArtifactMeta[]
  sessions: ReviewSessionRecord[]
  iterations: IterationRecord[]
  /** Annotations for the active (open) session. */
  annotations: Annotation[]
  referenceId: string | null
  currentId: string | null
  mode: ComparisonMode
  fullscreen: boolean
  annotating: boolean

  init: (projectId: string | null) => Promise<void>
  refresh: () => Promise<void>
  select: (role: ScreenshotRole, id: string) => void
  setMode: (mode: ComparisonMode) => void
  setFullscreen: (fullscreen: boolean) => void
  setAnnotating: (annotating: boolean) => void
  importFiles: (files: File[], role: ScreenshotRole) => Promise<void>
  removeScreenshot: (id: string) => Promise<void>
  startReview: () => Promise<void>
  annotate: (input: Omit<AnnotationInput, 'sessionId'>) => Promise<void>
  resolveAnnotation: (id: string, resolved: boolean) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>
  score: (score: CategoryScore) => Promise<void>
  saveSummary: (summary: string) => Promise<void>
  complete: (recommendation: ReviewRecommendation, summary: string) => Promise<void>
}

export function activeSession(state: Pick<ReviewState, 'sessions'>): ReviewSessionRecord | null {
  return state.sessions.find((s) => s.status === 'open') ?? null
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  projectId: null,
  screenshots: [],
  sessions: [],
  iterations: [],
  annotations: [],
  referenceId: null,
  currentId: null,
  mode: 'side-by-side',
  fullscreen: false,
  annotating: false,

  init: async (projectId) => {
    set({
      projectId,
      screenshots: [],
      sessions: [],
      iterations: [],
      annotations: [],
      referenceId: null,
      currentId: null,
      fullscreen: false,
      annotating: false
    })
    if (projectId) await get().refresh()
  },

  refresh: async () => {
    const { projectId } = get()
    if (!projectId) return
    const [screenshots, sessions, iterations] = await Promise.all([
      api.screenshots.list(projectId),
      api.review.sessions(projectId),
      api.review.iterations(projectId)
    ])
    const open = sessions.find((s) => s.status === 'open')
    const annotations = open ? await api.review.annotations(open.id) : []

    set((state) => ({
      screenshots,
      sessions,
      iterations,
      annotations,
      // Keep selections when still valid; otherwise pick sensible defaults.
      referenceId: pickSelection(state.referenceId, screenshots, 'reference'),
      currentId: pickSelection(state.currentId, screenshots, 'current')
    }))
  },

  select: (role, id) => set(role === 'reference' ? { referenceId: id } : { currentId: id }),
  setMode: (mode) => set({ mode }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
  setAnnotating: (annotating) => set({ annotating }),

  importFiles: async (files, role) => {
    const { projectId } = get()
    if (!projectId) return
    for (const file of files.filter(isImageFile)) {
      await api.review.import(projectId, await toFileUpload(file), { role })
    }
    await get().refresh()
  },

  removeScreenshot: async (id) => {
    await api.screenshots.remove(id)
    await get().refresh()
  },

  startReview: async () => {
    const { projectId } = get()
    if (!projectId) return
    await api.review.start(projectId)
    await get().refresh()
  },

  annotate: async (input) => {
    const session = activeSession(get())
    if (!session) return
    await api.review.annotate({ ...input, sessionId: session.id })
    set({ annotations: await api.review.annotations(session.id) })
  },

  resolveAnnotation: async (id, resolved) => {
    await api.review.resolveAnnotation(id, resolved)
    const session = activeSession(get())
    if (session) set({ annotations: await api.review.annotations(session.id) })
  },

  deleteAnnotation: async (id) => {
    await api.review.deleteAnnotation(id)
    const session = activeSession(get())
    if (session) set({ annotations: await api.review.annotations(session.id) })
  },

  score: async (score) => {
    const session = activeSession(get())
    if (!session) return
    const updated = await api.review.score(session.id, score)
    set((state) => ({ sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)) }))
  },

  saveSummary: async (summary) => {
    const session = activeSession(get())
    if (!session) return
    const updated = await api.review.summary(session.id, summary)
    set((state) => ({ sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)) }))
  },

  complete: async (recommendation, summary) => {
    const session = activeSession(get())
    if (!session) return
    await api.review.complete(session.id, recommendation, summary)
    set({ annotating: false })
    await get().refresh()
  }
}))

function pickSelection(
  currentSelection: string | null,
  screenshots: ScreenshotArtifactMeta[],
  role: ScreenshotRole
): string | null {
  if (currentSelection && screenshots.some((s) => s.id === currentSelection)) {
    return currentSelection
  }
  const candidates = screenshots.filter((s) => s.role === role)
  return candidates[0]?.id ?? null
}
