import type { ArtifactDraft, ArtifactKind } from '../../runtime/types'
import type { Capability } from '../types'
import type { ParsedResponse, ParsedSection } from './PromptParser'

interface ArtifactRule {
  pattern: RegExp
  name: string
  kind: ArtifactKind
  description: string
}

/**
 * Heading → artifact conventions. Any provider (manual or API) whose
 * response follows these markdown conventions produces first-class studio
 * artifacts. Order matters: first match per section wins.
 */
const RULES: ArtifactRule[] = [
  {
    pattern: /creative\s*spec/i,
    name: 'creative-spec.md',
    kind: 'spec',
    description: 'Design specification (imported)'
  },
  {
    pattern: /build\s*plan|implementation\s*plan/i,
    name: 'implementation-plan.md',
    kind: 'plan',
    description: 'Implementation plan (imported)'
  },
  {
    pattern: /build\s*log/i,
    name: 'build-log.txt',
    kind: 'log',
    description: 'Build log (imported)'
  },
  {
    pattern: /^qa\b|qa\s*(feedback|report|review)|design\s*review/i,
    name: 'qa-feedback.md',
    kind: 'qa-report',
    description: 'QA review (imported)'
  }
]

/** What an unstructured response becomes, per capability. */
const FALLBACKS: Record<Capability, { name: string; kind: ArtifactKind; description: string }> = {
  'creative-direction': {
    name: 'creative-response.md',
    kind: 'spec',
    description: 'Creative response (imported, unstructured)'
  },
  engineering: {
    name: 'build-notes.md',
    kind: 'log',
    description: 'Build notes (imported, unstructured)'
  },
  'design-qa': {
    name: 'qa-feedback.md',
    kind: 'qa-report',
    description: 'QA review (imported, unstructured)'
  }
}

export function artifactsFromResponse(
  parsed: ParsedResponse,
  raw: string,
  capability: Capability
): ArtifactDraft[] {
  const drafts: ArtifactDraft[] = []
  const used = new Set<string>()

  for (const section of parsed.sections) {
    const rule = RULES.find((r) => r.pattern.test(section.heading))
    if (!rule || used.has(rule.name)) continue
    used.add(rule.name)
    drafts.push({
      name: rule.name,
      kind: rule.kind,
      description: rule.description,
      content: sectionMarkdown(section)
    })
  }

  for (const block of parsed.codeBlocks) {
    if (!block.filename || used.has(block.filename)) continue
    used.add(block.filename)
    drafts.push({
      name: block.filename,
      kind: 'code',
      description: `Code (imported${block.language ? `, ${block.language}` : ''})`,
      content: block.content
    })
  }

  if (drafts.length === 0 && raw.trim()) {
    const fallback = FALLBACKS[capability]
    drafts.push({ ...fallback, content: raw.trim() })
  }

  return drafts
}

function sectionMarkdown(section: ParsedSection): string {
  return `${'#'.repeat(section.level)} ${section.heading}\n\n${section.content}`.trim()
}
