import type { MissionContext } from '../../runtime/types'
import { SimulatedAgent, emit, type SimStep } from '../SimulatedAgent'

const REJECTION_REASON = 'Footer needs stronger visual anchor.'

export class SimulatedDesignQa extends SimulatedAgent {
  constructor(speed?: number) {
    super({
      id: 'design-qa',
      name: 'Design QA',
      role: 'qa',
      description: 'Reviews output against the spec and files feedback',
      speed
    })
  }

  protected script(ctx: MissionContext): SimStep[] {
    // First review rejects (footer anchor); the review after a rework approves.
    const approved = ctx.attempt > 0
    const previews = ctx.artifacts.filter((a) => a.kind === 'image').length

    const shared: SimStep[] = [
      emit.status(200, 'reviewing'),
      emit.message(700, `Reviewing screenshots… ${previews} preview${previews === 1 ? '' : 's'} against creative-spec.md.`),
      emit.progress(900, 30, 'Hierarchy'),
      emit.message(800, `Hierarchy score: ${approved ? '9.2' : '8.6'}`),
      emit.progress(700, 60, 'Spacing'),
      emit.message(800, 'Spacing score: 9.1'),
      emit.progress(600, 85, 'Anchoring')
    ]

    if (!approved) {
      return [
        ...shared,
        emit.message(900, 'Footer anchoring score: 6.4 — below threshold.'),
        emit.artifact(800, {
          name: 'qa-feedback.md',
          kind: 'qa-report',
          description: 'Review feedback — rejected',
          content: qaReport(ctx, false)
        }),
        emit.message(600, `Rejected. Reason: ${REJECTION_REASON}`),
        emit.verdict(400, false, REJECTION_REASON)
      ]
    }

    return [
      ...shared,
      emit.message(900, 'Footer anchoring score: 9.0 — rework verified.'),
      emit.artifact(800, {
        name: 'qa-approval.md',
        kind: 'qa-report',
        description: 'Review feedback — approved',
        content: qaReport(ctx, true)
      }),
      emit.progress(300, 100, 'Review'),
      emit.message(500, 'Approved. Build meets the specification.'),
      emit.verdict(400, true)
    ]
  }
}

function qaReport(ctx: MissionContext, approved: boolean): string {
  return `# QA ${approved ? 'Approval' : 'Feedback'} — ${ctx.mission.title}

| Dimension  | Score |
| ---------- | ----- |
| Hierarchy  | ${approved ? '9.2' : '8.6'} |
| Spacing    | 9.1   |
| Anchoring  | ${approved ? '9.0' : '6.4'} |

${
  approved
    ? 'Verdict: **Approved.** The footer rework resolves the anchoring issue; the build matches creative-spec.md.'
    : `Verdict: **Rejected.**\n\nReason: ${REJECTION_REASON}\n\nRecommendation: add a top rule or heavier surface to the footer band and tighten the sitemap columns so the page ends with intent.`
}
`
}
