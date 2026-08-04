import type {
  ReviewTheme,
  ScreenshotArtifactMeta,
  ScreenshotRole,
  ScreenshotSource,
  Viewport
} from './types'

export interface ScreenshotInput {
  projectId: string
  missionId?: string | null
  iteration?: number
  filePath: string
  label: string
  viewport?: Viewport
  theme?: ReviewTheme
  source?: ScreenshotSource
  role?: ScreenshotRole
}

/** Builds a complete screenshot record, inferring viewport from the name. */
export function createScreenshotMeta(input: ScreenshotInput): ScreenshotArtifactMeta {
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    missionId: input.missionId ?? null,
    iteration: input.iteration ?? 1,
    filePath: input.filePath,
    label: input.label,
    viewport: input.viewport ?? guessViewport(input.label),
    theme: input.theme ?? 'dark',
    source: input.source ?? 'import',
    role: input.role ?? 'current',
    createdAt: Date.now()
  }
}

/** "mobile-home.png" → mobile; "tablet-pricing.png" → tablet; else desktop. */
export function guessViewport(label: string): Viewport {
  if (/mobile|phone|375|390/i.test(label)) return 'mobile'
  if (/tablet|ipad|768|834/i.test(label)) return 'tablet'
  return 'desktop'
}

export const VIEWPORT_LABELS: Record<Viewport, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile'
}
