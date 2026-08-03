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

export type TimelineEventType =
  | 'project.created'
  | 'project.renamed'
  | 'project.brief_updated'
  | 'inspiration.added'
  | 'inspiration.removed'
  | 'note.created'
  | 'note.updated'
  | 'note.deleted'
  | 'spec.created'
  | 'spec.updated'
  | 'spec.deleted'
  | 'screenshot.added'
  | 'screenshot.removed'
  | 'qa.added'
  | 'qa.resolved'
  | 'qa.reopened'
  | 'qa.deleted'

export interface TimelineEvent {
  id: string
  projectId: string
  type: TimelineEventType
  message: string
  /** Originating actor. 'you' for the human; agent ids in Phase 2. */
  actor: string
  createdAt: number
}

export interface Screenshot {
  id: string
  projectId: string
  filePath: string
  label: string
  createdAt: number
}

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

/**
 * Agent roster. Static in Phase 1 — the orchestration layer that drives
 * these arrives in Phase 2, but the shape is fixed now so panels can bind to it.
 */
export interface AgentInfo {
  id: string
  name: string
  role: string
  provider: 'claude-code' | 'anthropic-api' | 'builtin'
  status: 'idle' | 'running' | 'unavailable'
}

/** Payload for uploading a binary file (image) from the renderer. */
export interface FileUpload {
  name: string
  /** Raw file bytes. Structured-cloned across the IPC boundary. */
  bytes: ArrayBuffer
}
