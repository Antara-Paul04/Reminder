/** Domain types shared between the main process and the renderer. */

export interface Project {
  id: string
  name: string
  brief: string
  status: 'active' | 'archived'
  createdAt: number
  updatedAt: number
  lastOpenedAt: number
}

export type InspirationKind = 'image' | 'url'

export interface InspirationItem {
  id: string
  projectId: string
  kind: InspirationKind
  title: string
  /** Relative path inside the media library (images only). */
  filePath: string | null
  url: string | null
  createdAt: number
}

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface Spec {
  id: string
  projectId: string
  title: string
  content: string
  /** Who authored the spec. Human now; agents in Phase 2. */
  author: string
  createdAt: number
  updatedAt: number
}

/**
 * Timeline event types are open-ended strings namespaced by prefix
 * ('project.*', 'note.*', 'mission.*', 'agent.*', 'artifact.*', …) — the
 * runtime contributes its own entries alongside user actions.
 */
export type TimelineEventType = string

export interface TimelineEvent {
  id: string
  projectId: string
  type: TimelineEventType
  message: string
  /** Originating actor. 'you' for the human; agent names for the runtime. */
  actor: string
  createdAt: number
}

// Screenshots are review artifacts now — see the review re-exports below.

export type QaSeverity = 'low' | 'medium' | 'high'
export type QaStatus = 'open' | 'resolved'

export interface QaItem {
  id: string
  projectId: string
  content: string
  severity: QaSeverity
  status: QaStatus
  createdAt: number
}

// ---------------------------------------------------------------------------
// Runtime wire types. The renderer consumes runtime state exclusively through
// these re-exports — it never imports provider code.
// ---------------------------------------------------------------------------

export type {
  AgentRole,
  AgentStatus,
  ArtifactKind,
  MissionStage,
  MissionStatus,
  RuntimeEvent
} from '../core/runtime/types'
export { MISSION_STAGES, STAGE_LABELS } from '../core/runtime/types'
export type { AgentDescriptor } from '../core/runtime/Agent'
export type {
  Capability,
  ProviderDescriptor,
  ProviderStatus,
  ProviderType
} from '../core/providers/types'
export { CAPABILITY_LABELS, ROLE_CAPABILITY } from '../core/providers/types'
export type { PendingManualRequest } from '../core/providers/manual/ManualProvider'
export type {
  ClaudeCodeConfig,
  ClaudeCodeHealth
} from '../core/providers/claude-code/ClaudeCodeConfig'

// Review system (src/core/review)
export type {
  Annotation,
  AnnotationSeverity,
  CategoryScore,
  IterationRecord,
  ReviewCategory,
  ReviewRecommendation,
  ReviewSessionRecord,
  ReviewTheme,
  ScreenshotArtifactMeta,
  ScreenshotRole,
  Viewport
} from '../core/review/types'
export { REVIEW_CATEGORIES } from '../core/review/types'
export type { AnnotationInput } from '../core/review/Annotation'
export { overallScore } from '../core/review/ReviewSession'
export type {
  ManualSessionRecord,
  ManualSessionStatus
} from '../core/providers/manual/ManualSession'

/** Basic app metadata for the Settings → General section. */
export interface AppInfo {
  version: string
  dataDir: string
}

import type { ArtifactKind, MissionStage, MissionStatus } from '../core/runtime/types'

/** Persisted mission row (survives restarts; live state comes via events). */
export interface MissionRecord {
  id: string
  projectId: string
  title: string
  brief: string
  status: MissionStatus
  stage: MissionStage
  failedStepIndex: number | null
  archived: boolean
  createdAt: number
  updatedAt: number
}

/** Stage checkpoint recorded by the autonomous loop. */
export interface MissionCheckpoint {
  id: string
  missionId: string
  projectId: string
  stage: MissionStage
  iteration: number
  artifactCount: number
  createdAt: number
}

export type { MissionMetricsSnapshot } from '../core/runtime/types'
export type {
  LoopPolicy
} from '../core/runtime/orchestrator/LoopPolicy'
export { DEFAULT_LOOP_POLICY } from '../core/runtime/orchestrator/LoopPolicy'
export type { RetryStrategy } from '../core/runtime/orchestrator/RetryStrategy'
export type {
  MissionOutcome,
  MissionReportData
} from '../core/runtime/orchestrator/MissionReport'

/** Persisted artifact row. */
export interface MissionArtifactRecord {
  id: string
  missionId: string
  name: string
  kind: ArtifactKind
  description: string
  content: string
  createdBy: string
  createdAt: number
}

/** Payload for uploading a binary file (image) from the renderer. */
export interface FileUpload {
  name: string
  /** Raw file bytes. Structured-cloned across the IPC boundary. */
  bytes: ArrayBuffer
}
