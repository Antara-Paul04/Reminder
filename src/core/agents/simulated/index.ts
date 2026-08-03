import type { AgentRuntime } from '../../runtime/AgentRuntime'
import { SimulatedCreativeDirector } from './creativeDirector'
import { SimulatedEngineer } from './engineer'
import { SimulatedDesignQa } from './designQa'

/** Registers the full simulated roster on a runtime. */
export function registerSimulatedAgents(runtime: AgentRuntime, speed?: number): void {
  runtime.register(new SimulatedCreativeDirector(speed))
  runtime.register(new SimulatedEngineer(speed))
  runtime.register(new SimulatedDesignQa(speed))
}

export { SimulatedCreativeDirector, SimulatedEngineer, SimulatedDesignQa }
