import type { ScreenshotArtifactMeta } from './types'

/**
 * Pure comparison-pair logic shared by the UI (and, later, by vision
 * providers that diff reference vs current captures).
 */

export type ComparisonMode = 'side-by-side' | 'slider'

export interface ComparisonPair {
  reference: ScreenshotArtifactMeta | null
  current: ScreenshotArtifactMeta | null
}

/**
 * Best default pairing: latest current build capture, matched with a
 * reference of the same viewport when one exists.
 */
export function defaultPair(screenshots: ScreenshotArtifactMeta[]): ComparisonPair {
  const currents = screenshots
    .filter((s) => s.role === 'current')
    .sort((a, b) => b.iteration - a.iteration || b.createdAt - a.createdAt)
  const references = screenshots.filter((s) => s.role === 'reference')

  const current = currents[0] ?? null
  const reference = current
    ? (references.find((r) => r.viewport === current.viewport) ?? references[0] ?? null)
    : (references[0] ?? null)
  return { reference, current }
}

/** Captures for one iteration, newest first. */
export function iterationScreenshots(
  screenshots: ScreenshotArtifactMeta[],
  iteration: number
): ScreenshotArtifactMeta[] {
  return screenshots
    .filter((s) => s.role === 'reference' || s.iteration === iteration)
    .sort((a, b) => b.createdAt - a.createdAt)
}
