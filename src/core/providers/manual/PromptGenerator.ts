import { STAGE_LABELS, type Artifact } from '../../runtime/types'
import type { Capability, ProviderExecutionRequest } from '../types'

/** Max characters of each prior artifact inlined into a prompt. */
const ARTIFACT_EXCERPT_LIMIT = 1500

/**
 * Deterministic, structured prompt generation. The same request always
 * produces the same prompt — no timestamps, no randomness — so prompts are
 * reproducible and diffable across sessions.
 */
export function generatePrompt(request: ProviderExecutionRequest, providerName: string): string {
  const { context, capability } = request
  const sections = [
    ...contextSections(request),
    section('TASK', TASKS[capability](context.attempt)),
    section('EXPECTED OUTPUT FORMAT', OUTPUT_FORMATS[capability])
  ]
  const header =
    `You are acting as the ${roleTitle(capability)} inside AI Studio, an orchestration ` +
    `platform building a premium Framer template. This prompt was generated for ${providerName}. ` +
    `Reply in plain markdown exactly following the EXPECTED OUTPUT FORMAT.`
  return [header, ...sections].join('\n\n')
}

/**
 * The shared context block (MISSION / PROJECT CONTEXT / REFERENCES /
 * PREVIOUS DECISIONS). Every provider — manual, CLI, API — builds on these
 * exact sections; only TASK and output contract differ per provider type.
 */
export function contextSections(request: ProviderExecutionRequest): string[] {
  return [
    section('MISSION', missionBlock(request)),
    section('PROJECT CONTEXT', contextBlock(request)),
    section('REFERENCES', referencesBlock(request)),
    section('PREVIOUS DECISIONS', decisionsBlock(request))
  ]
}

function section(title: string, body: string): string {
  return `# ${title}\n${body.trim() || '_None._'}`
}

function missionBlock({ context }: ProviderExecutionRequest): string {
  const rework =
    context.attempt > 0
      ? `\nThis is attempt ${context.attempt + 1} — previous work was rejected; address the QA feedback in PREVIOUS DECISIONS.`
      : ''
  return `${context.mission.title}\nCurrent stage: ${STAGE_LABELS[context.mission.stage]}.${rework}`
}

function contextBlock({ context }: ProviderExecutionRequest): string {
  const notes = context.notes.map((n) => `- ${n}`).join('\n')
  return `Brief: ${context.brief || '_No brief provided._'}${notes ? `\n\nNotes:\n${notes}` : ''}`
}

function referencesBlock({ context }: ProviderExecutionRequest): string {
  return context.references
    .map((r) => `- ${r.kind === 'url' ? `Website: ${r.url ?? r.title}` : `Image: ${r.title}`}`)
    .join('\n')
}

function decisionsBlock({ context, memory }: ProviderExecutionRequest): string {
  const memoryLines = memory.map((m) => `- ${m}`)
  const artifactLines = context.artifacts.map(artifactExcerpt)
  return [...memoryLines, ...artifactLines].join('\n')
}

function artifactExcerpt(artifact: Artifact): string {
  if (artifact.kind === 'image') {
    return `- Artifact ${artifact.name} (${artifact.description}) — image, not inlined.`
  }
  const excerpt =
    artifact.content.length > ARTIFACT_EXCERPT_LIMIT
      ? `${artifact.content.slice(0, ARTIFACT_EXCERPT_LIMIT)}\n…(truncated)`
      : artifact.content
  return `- Artifact ${artifact.name} (${artifact.description}):\n\n\`\`\`\n${excerpt}\n\`\`\``
}

function roleTitle(capability: Capability): string {
  return capability === 'creative-direction'
    ? 'Creative Director'
    : capability === 'engineering'
      ? 'Engineer'
      : 'Design QA reviewer'
}

const TASKS: Record<Capability, (attempt: number) => string> = {
  'creative-direction': () =>
    'Analyze the brief, notes and references. Define the creative direction — typography, ' +
    'layout system, palette, motion — then write the full specification and break it into an ' +
    'ordered implementation plan an engineer can follow.',
  engineering: (attempt) =>
    attempt > 0
      ? 'Rework the build to address the QA feedback in PREVIOUS DECISIONS. Describe exactly ' +
        'what you changed and provide updated code for affected sections.'
      : 'Implement the creative specification section by section. Describe the build in a build ' +
        'log and provide code for the key components.',
  'design-qa': () =>
    'Review the build artifacts in PREVIOUS DECISIONS against the creative specification. Score ' +
    'hierarchy, spacing and visual anchoring from 0–10, list concrete issues, and give a verdict.'
}

const OUTPUT_FORMATS: Record<Capability, string> = {
  'creative-direction': `Respond with exactly these markdown sections:

# Creative Spec
(direction, typography, layout, palette, motion — full specification)

# Build Plan
(numbered, ordered implementation steps)

## Decisions
(bullet list of the key decisions you made and why)`,
  engineering: `Respond with exactly these markdown sections:

# Build Log
(what was built, section by section, and anything skipped)

Code blocks for key components, each fenced with the target filename, e.g.:
\`\`\`tsx hero-component.tsx
...
\`\`\`

## Decisions
(bullet list of implementation decisions)`,
  'design-qa': `Respond with exactly these markdown sections:

# QA
| Dimension | Score |
| --------- | ----- |
(hierarchy, spacing, anchoring — 0–10 each)

Issues as a bullet list.

Verdict: Approved OR Verdict: Rejected
Reason: (one line, required when rejected)`
}
