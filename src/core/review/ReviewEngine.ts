import { createAnnotation, type AnnotationInput } from './Annotation'
import { reviewEvent, type ReviewEventEmitter } from './ReviewEvents'
import { applyScore, createReviewSession } from './ReviewSession'
import { createScreenshotMeta, type ScreenshotInput } from './ScreenshotArtifact'
import type {
  Annotation,
  CategoryScore,
  IterationRecord,
  ReviewRecommendation,
  ReviewSessionRecord,
  ScreenshotArtifactMeta
} from './types'

/** Persistence port implemented by the host (SQLite in main, fakes in tests). */
export interface ReviewStore {
  insertScreenshot(meta: ScreenshotArtifactMeta): void
  getSession(id: string): ReviewSessionRecord | null
  insertSession(session: ReviewSessionRecord): void
  updateSession(session: ReviewSessionRecord): void
  insertAnnotation(annotation: Annotation): void
  ensureIteration(projectId: string, missionId: string | null): IterationRecord
  currentIteration(projectId: string): IterationRecord | null
  setIterationStatus(id: string, status: IterationRecord['status']): void
}

/**
 * FUTURE SEAM — an AI vision reviewer. GPT Vision, Gemini Vision or Claude
 * Vision implement this and call the same engine methods a human does
 * (annotations, scores, completion) — nothing outside the engine changes.
 */
export interface VisionReviewProvider {
  id: string
  name: string
  review(input: {
    session: ReviewSessionRecord
    screenshots: ScreenshotArtifactMeta[]
    spec: string | null
  }): Promise<{
    annotations: AnnotationInput[]
    scores: CategoryScore[]
    summary: string
    recommendation: ReviewRecommendation
  }>
}

/**
 * Provider-independent review orchestration. Humans drive it through IPC
 * today; vision providers will drive the exact same methods. Every mutation
 * is announced on the runtime bus and persisted through the store port.
 */
export class ReviewEngine {
  private visionProviders = new Map<string, VisionReviewProvider>()

  constructor(
    private readonly store: ReviewStore,
    private readonly emit: ReviewEventEmitter
  ) {}

  registerVisionProvider(provider: VisionReviewProvider): void {
    this.visionProviders.set(provider.id, provider)
  }

  listVisionProviders(): { id: string; name: string }[] {
    return [...this.visionProviders.values()].map(({ id, name }) => ({ id, name }))
  }

  /** Records an imported/generated capture as a first-class artifact. */
  importScreenshot(input: ScreenshotInput): ScreenshotArtifactMeta {
    const iteration =
      input.iteration ?? this.store.ensureIteration(input.projectId, input.missionId ?? null).index
    const meta = createScreenshotMeta({ ...input, iteration })
    this.store.insertScreenshot(meta)
    this.emit(
      reviewEvent('review.screenshot.imported', {
        projectId: meta.projectId,
        screenshotId: meta.id,
        label: meta.label,
        iteration: meta.iteration,
        role: meta.role
      })
    )
    return meta
  }

  startSession(projectId: string, reviewer = 'you'): ReviewSessionRecord {
    const iteration = this.store.ensureIteration(projectId, null)
    if (iteration.status === 'building') this.store.setIterationStatus(iteration.id, 'in-review')

    const session = createReviewSession({
      projectId,
      missionId: iteration.missionId,
      iteration: iteration.index,
      reviewer
    })
    this.store.insertSession(session)
    this.emit(
      reviewEvent('review.started', {
        projectId,
        sessionId: session.id,
        iteration: session.iteration
      })
    )
    return session
  }

  addAnnotation(input: AnnotationInput): Annotation {
    const session = this.requireOpenSession(input.sessionId)
    const annotation = createAnnotation({ ...input, author: input.author ?? session.reviewer })
    this.store.insertAnnotation(annotation)
    this.emit(
      reviewEvent('review.annotation.added', {
        projectId: session.projectId,
        sessionId: session.id,
        annotationId: annotation.id,
        text: annotation.text
      })
    )
    return annotation
  }

  scoreCategory(sessionId: string, score: CategoryScore): ReviewSessionRecord {
    const session = this.requireOpenSession(sessionId)
    const updated = { ...session, scores: applyScore(session.scores, score) }
    this.store.updateSession(updated)
    return updated
  }

  updateSummary(sessionId: string, summary: string): ReviewSessionRecord {
    const session = this.requireOpenSession(sessionId)
    const updated = { ...session, summary }
    this.store.updateSession(updated)
    return updated
  }

  completeSession(
    sessionId: string,
    recommendation: ReviewRecommendation,
    summary?: string
  ): ReviewSessionRecord {
    const session = this.requireOpenSession(sessionId)
    const updated: ReviewSessionRecord = {
      ...session,
      status: 'completed',
      summary: summary ?? session.summary,
      recommendation,
      completedAt: Date.now()
    }
    this.store.updateSession(updated)
    this.emit(
      reviewEvent('review.completed', {
        projectId: session.projectId,
        sessionId: session.id,
        iteration: session.iteration,
        recommendation
      })
    )

    // Approve/reject settles the iteration; 'revise' leaves it in review.
    if (recommendation !== 'revise') {
      const iteration = this.store.currentIteration(session.projectId)
      if (iteration && iteration.index === session.iteration) {
        const status = recommendation === 'approve' ? 'approved' : 'rejected'
        this.store.setIterationStatus(iteration.id, status)
        this.emit(
          reviewEvent('review.iteration', {
            projectId: session.projectId,
            iteration: iteration.index,
            status
          })
        )
      }
    }
    return updated
  }

  private requireOpenSession(sessionId: string): ReviewSessionRecord {
    const session = this.store.getSession(sessionId)
    if (!session) throw new Error(`Unknown review session: ${sessionId}`)
    if (session.status !== 'open') throw new Error('Review session is already completed')
    return session
  }
}
