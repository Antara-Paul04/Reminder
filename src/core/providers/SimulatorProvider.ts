import { MissionCancelledError, type MissionContext } from '../runtime/types'
import type { Provider } from './Provider'
import type { ProviderStreamEvent } from './ProviderEvents'
import type { Capability, ProviderExecutionRequest, ProviderStatus } from './types'
import { creativeDirectorScript } from './simulator/scripts/creativeDirector'
import { designQaScript } from './simulator/scripts/designQa'
import { engineerScript } from './simulator/scripts/engineer'
import type { SimStep } from './simulator/steps'

const SCRIPTS: Record<Capability, (ctx: MissionContext) => SimStep[]> = {
  'creative-direction': creativeDirectorScript,
  engineering: engineerScript,
  'design-qa': designQaScript
}

/**
 * The built-in provider: plays timed, context-aware scripts for every
 * capability. It is deliberately just another `Provider` — the same
 * registration, selection, connection and execution path a real Claude
 * Code or GPT provider will use. That is what validates the architecture.
 */
export class SimulatorProvider implements Provider {
  readonly id = 'simulator'
  readonly name = 'Simulator'
  readonly type = 'simulator' as const
  readonly capabilities: Capability[] = ['creative-direction', 'engineering', 'design-qa']
  readonly description = 'Built-in scripted agents with realistic pacing. No network, no cost.'
  status: ProviderStatus = 'disconnected'

  /** speed < 1 accelerates playback (demos/tests). */
  constructor(private readonly speed = 1) {}

  connect(): Promise<void> {
    return Promise.resolve()
  }

  disconnect(): Promise<void> {
    return Promise.resolve()
  }

  async *execute(request: ProviderExecutionRequest): AsyncGenerator<ProviderStreamEvent> {
    const script = SCRIPTS[request.capability]
    if (!script) throw new Error(`Simulator cannot handle capability: ${request.capability}`)

    for (const step of script(request.context)) {
      await this.sleep(step.after, request.context.signal)
      yield step.event
    }
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    const jittered = ms * this.speed * (0.8 + Math.random() * 0.4)
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new MissionCancelledError())
        return
      }
      const timer = setTimeout(() => resolve(), jittered)
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new MissionCancelledError())
        },
        { once: true }
      )
    })
  }
}
