import type { Annotation, AnnotationSeverity, ReviewCategory } from './types'

export interface AnnotationInput {
  sessionId: string
  screenshotId: string
  x: number
  y: number
  text: string
  category?: ReviewCategory | null
  severity?: AnnotationSeverity
  author?: string
}

/**
 * Creates a coordinate-anchored annotation. Human clicks produce these
 * today; AI vision reviews will produce identical objects tomorrow —
 * only `author` differs.
 */
export function createAnnotation(input: AnnotationInput): Annotation {
  const text = input.text.trim()
  if (!text) throw new Error('Annotation text is required')
  return {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    screenshotId: input.screenshotId,
    x: clamp01(input.x),
    y: clamp01(input.y),
    text,
    category: input.category ?? null,
    severity: input.severity ?? 'medium',
    author: input.author ?? 'you',
    resolved: false,
    createdAt: Date.now()
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
