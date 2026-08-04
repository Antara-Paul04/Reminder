import { ReviewEngine, type ReviewStore } from '../../core/review/ReviewEngine'
import type { ReviewEventEmitter } from '../../core/review/ReviewEvents'
import {
  currentIteration,
  ensureIteration,
  getReviewSession,
  insertAnnotation,
  insertReviewSession,
  setIterationStatus,
  updateReviewSession
} from '../db/review'
import { insertScreenshotMeta } from '../db/screenshots'

let engine: ReviewEngine | null = null

const sqliteStore: ReviewStore = {
  insertScreenshot: (meta) => insertScreenshotMeta(meta),
  getSession: (id) => getReviewSession(id),
  insertSession: (session) => insertReviewSession(session),
  updateSession: (session) => updateReviewSession(session),
  insertAnnotation: (annotation) => insertAnnotation(annotation),
  ensureIteration: (projectId, missionId) => ensureIteration(projectId, missionId),
  currentIteration: (projectId) => currentIteration(projectId),
  setIterationStatus: (id, status) => setIterationStatus(id, status)
}

export function initReviewEngine(emit: ReviewEventEmitter): void {
  engine = new ReviewEngine(sqliteStore, emit)
}

export function getReviewEngine(): ReviewEngine {
  if (!engine) throw new Error('Review engine not initialised')
  return engine
}
