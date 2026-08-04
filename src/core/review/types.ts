/**
 * Visual review vocabulary. Every object here is a plain, serializable
 * record — they cross IPC, persist to SQLite, and will be produced by AI
 * vision providers without any shape changes.
 */

export type Viewport = 'desktop' | 'tablet' | 'mobile'
export type ReviewTheme = 'dark' | 'light'
export type ScreenshotRole = 'reference' | 'current'
export type ScreenshotSource = 'engineer' | 'import' | 'agent'

export interface ScreenshotArtifactMeta {
  id: string
  projectId: string
  missionId: string | null
  /** Which build iteration this capture belongs to. */
  iteration: number
  /** Relative path inside the media library. */
  filePath: string
  label: string
  viewport: Viewport
  theme: ReviewTheme
  source: ScreenshotSource
  role: ScreenshotRole
  createdAt: number
}

export type ReviewCategory =
  | 'hierarchy'
  | 'spacing'
  | 'typography'
  | 'colour'
  | 'motion'
  | 'responsiveness'
  | 'accessibility'
  | 'originality'

export const REVIEW_CATEGORIES: ReviewCategory[] = [
  'hierarchy',
  'spacing',
  'typography',
  'colour',
  'motion',
  'responsiveness',
  'accessibility',
  'originality'
]

export interface CategoryScore {
  category: ReviewCategory
  /** 0–10; null = not scored. */
  score: number | null
  notes: string
  /** 0–1; humans default to 1, vision providers report model confidence. */
  confidence: number | null
}

export type AnnotationSeverity = 'low' | 'medium' | 'high'

export interface Annotation {
  id: string
  sessionId: string
  screenshotId: string
  /** Normalized coordinates (0–1) so they survive any zoom or resize. */
  x: number
  y: number
  text: string
  category: ReviewCategory | null
  severity: AnnotationSeverity
  /** 'you' for human annotations; a provider id for AI reviews. */
  author: string
  resolved: boolean
  createdAt: number
}

export type ReviewRecommendation = 'approve' | 'reject' | 'revise'

export interface ReviewSessionRecord {
  id: string
  projectId: string
  missionId: string | null
  iteration: number
  status: 'open' | 'completed'
  /** 'you' or a vision provider id — nothing downstream cares which. */
  reviewer: string
  scores: CategoryScore[]
  summary: string
  recommendation: ReviewRecommendation | null
  createdAt: number
  completedAt: number | null
}

export type IterationStatus = 'building' | 'in-review' | 'approved' | 'rejected'

export interface IterationRecord {
  id: string
  projectId: string
  missionId: string | null
  index: number
  status: IterationStatus
  createdAt: number
  updatedAt: number
}
