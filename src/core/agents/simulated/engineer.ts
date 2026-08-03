import type { MissionContext } from '../../runtime/types'
import { SimulatedAgent, emit, type SimStep } from '../SimulatedAgent'
import { buildPreviewSvg } from './preview'

export class SimulatedEngineer extends SimulatedAgent {
  constructor(speed?: number) {
    super({
      id: 'engineer',
      name: 'Engineer',
      role: 'engineer',
      description: 'Claude Code — implements the spec as a Framer template',
      speed
    })
  }

  protected script(ctx: MissionContext): SimStep[] {
    return ctx.attempt === 0 ? this.firstPass(ctx) : this.rework(ctx)
  }

  private firstPass(ctx: MissionContext): SimStep[] {
    const spec = ctx.artifacts.find((a) => a.kind === 'spec')
    return [
      emit.status(200, 'waiting'),
      emit.message(700, spec ? `Reading ${spec.name}…` : 'Waiting for specification…'),
      emit.status(600, 'working'),
      emit.message(800, 'Scaffolding page shell and design tokens.'),
      emit.progress(900, 15, 'Scaffold'),
      emit.message(1000, 'Generating Hero — asymmetric grid, display serif, media slot.'),
      emit.artifact(1400, {
        name: 'hero-component.tsx',
        kind: 'code',
        description: 'Hero section component',
        content: heroComponent(ctx)
      }),
      emit.progress(400, 40, 'Hero'),
      emit.message(1000, 'Generating Features — 3-up card grid with icon set.'),
      emit.progress(900, 58, 'Features'),
      emit.message(900, 'Generating Showcase, Pricing, CTA and Footer.'),
      emit.progress(1100, 76, 'Sections'),
      emit.message(800, 'Running responsive pass — 1280 / 768 / 375.'),
      emit.progress(1000, 90, 'Responsive'),
      emit.artifact(900, {
        name: 'preview-desktop.svg',
        kind: 'image',
        description: 'Desktop preview capture',
        content: buildPreviewSvg(ctx.mission.title, 'first-pass')
      }),
      emit.artifact(800, {
        name: 'build-log.txt',
        kind: 'log',
        description: 'Build output',
        content: buildLog(ctx, 'first pass')
      }),
      emit.progress(300, 100, 'Build'),
      emit.message(500, 'Build complete. Previews and build log ready for QA.')
    ]
  }

  private rework(ctx: MissionContext): SimStep[] {
    const feedback = [...ctx.artifacts].reverse().find((a) => a.kind === 'qa-report')
    return [
      emit.status(200, 'thinking'),
      emit.message(700, feedback ? `Reading ${feedback.name} from Design QA…` : 'Reviewing rejection feedback…'),
      emit.status(600, 'working'),
      emit.message(900, 'Reworking footer — adding top rule, heavier surface and tightened sitemap columns.'),
      emit.progress(1000, 45, 'Footer rework'),
      emit.message(900, 'Re-running responsive pass on affected sections.'),
      emit.progress(900, 80, 'Responsive'),
      emit.artifact(900, {
        name: 'preview-desktop-v2.svg',
        kind: 'image',
        description: 'Desktop preview after rework',
        content: buildPreviewSvg(ctx.mission.title, 'rework')
      }),
      emit.artifact(700, {
        name: 'build-log.txt',
        kind: 'log',
        description: 'Build output (rework)',
        content: buildLog(ctx, 'rework — footer anchor addressed')
      }),
      emit.progress(300, 100, 'Build'),
      emit.message(500, 'Rework complete. Returning to Design QA.')
    ]
  }
}

function heroComponent(ctx: MissionContext): string {
  return `// ${ctx.mission.title} — Hero (generated)
export function Hero() {
  return (
    <section className="hero grid-12">
      <h1 className="display">Ship your story,
        <span className="accent"> beautifully.</span></h1>
      <p className="lede">A premium template tuned for conversion.</p>
      <a className="cta" href="#pricing">Get the template</a>
      <figure className="hero-media" data-parallax="0.85" />
    </section>
  )
}
`
}

function buildLog(ctx: MissionContext, label: string): string {
  return `# build-log — ${ctx.mission.title} (${label})
[ok] tokens        design tokens generated from creative-spec.md
[ok] hero          asymmetric grid, clamp() display scale
[ok] features      3-up grid, icon set inlined
[ok] showcase      full-bleed band, parallax 0.85
[ok] pricing       2 tiers, accent on recommended
[ok] footer        sitemap columns${label.includes('rework') ? ', reinforced visual anchor' : ''}
[ok] responsive    1280 / 768 / 375 verified
artifacts: preview-desktop${label.includes('rework') ? '-v2' : ''}.svg
`
}
