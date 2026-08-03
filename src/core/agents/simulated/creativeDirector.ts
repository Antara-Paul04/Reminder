import type { MissionContext } from '../../runtime/types'
import { SimulatedAgent, emit, type SimStep } from '../SimulatedAgent'

export class SimulatedCreativeDirector extends SimulatedAgent {
  constructor(speed?: number) {
    super({
      id: 'creative-director',
      name: 'Creative Director',
      role: 'creative',
      description: 'Turns briefs and inspiration into design specs',
      speed
    })
  }

  protected script(ctx: MissionContext): SimStep[] {
    const images = ctx.references.filter((r) => r.kind === 'image').length
    const urls = ctx.references.filter((r) => r.kind === 'url').length

    return [
      emit.status(200, 'thinking'),
      emit.message(600, `Analyzing inspiration… ${images} image${images === 1 ? '' : 's'}, ${urls} reference site${urls === 1 ? '' : 's'}.`),
      emit.progress(900, 10, 'Research'),
      emit.message(1100, 'Identifying typography — leaning editorial: oversized display serif paired with a tight grotesk.'),
      emit.progress(700, 24, 'Research'),
      emit.stage(500, 'creative-direction'),
      emit.status(200, 'working'),
      emit.message(900, 'Choosing layout — asymmetric hero, 12-column grid, generous 96px section rhythm.'),
      emit.progress(800, 45, 'Creative direction'),
      emit.message(1000, 'Locking palette — near-black base, single high-chroma accent, muted supporting neutrals.'),
      emit.progress(700, 62, 'Creative direction'),
      emit.message(800, 'Writing specification…'),
      emit.artifact(1400, {
        name: 'creative-spec.md',
        kind: 'spec',
        description: 'Design direction and component spec',
        content: creativeSpec(ctx)
      }),
      emit.progress(400, 80, 'Specification'),
      emit.stage(300, 'planning'),
      emit.message(800, 'Breaking the spec into an implementation plan for the Engineer.'),
      emit.artifact(1100, {
        name: 'implementation-plan.md',
        kind: 'plan',
        description: 'Ordered build plan derived from the spec',
        content: implementationPlan(ctx)
      }),
      emit.progress(300, 100, 'Planning'),
      emit.message(500, 'Specification complete. Handing off to the Engineer.')
    ]
  }
}

function creativeSpec(ctx: MissionContext): string {
  const refs = ctx.references
    .map((r) => `- ${r.kind === 'url' ? r.url ?? r.title : r.title}`)
    .join('\n')
  return `# Creative Specification — ${ctx.mission.title}

## Brief
${ctx.brief || '_No brief provided — direction inferred from references._'}

## References considered
${refs || '_None provided._'}

## Direction
Editorial confidence. Dark, near-black base (#0A0A0C) with one high-chroma accent.
Oversized display serif for headlines; tight grotesk for UI and body.

## Layout
- Asymmetric hero: headline left-weighted, media anchored right
- 12-column grid, 96px vertical rhythm between sections
- Sections: Hero · Logos · Features (3-up) · Showcase · Pricing · CTA · Footer

## Typography
- Display: 72/64/48 clamp scale, -2% tracking
- Body: 16/24, max measure 68ch

## Motion
- Scroll-triggered fades, 250ms ease-out, 40px translate
- Hero media parallax at 0.85 scroll rate
`
}

function implementationPlan(ctx: MissionContext): string {
  return `# Implementation Plan — ${ctx.mission.title}

1. Scaffold page shell and design tokens from creative-spec.md
2. Hero section — asymmetric grid, display type, media slot
3. Features — 3-up card grid with icon, title, body
4. Showcase — full-bleed media band with parallax
5. Pricing — 2 tiers, accent on recommended
6. CTA + Footer — strong visual anchor, sitemap columns
7. Responsive pass — 1280 / 768 / 375 breakpoints
8. Hand off build log and previews to Design QA
`
}
