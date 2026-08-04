import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, Notification } from 'electron'
import type { AgentRuntime } from '../../core/runtime/AgentRuntime'
import {
  normalizeLoopPolicy,
  type LoopPolicy
} from '../../core/runtime/orchestrator/LoopPolicy'
import { MissionOrchestrator } from '../../core/runtime/orchestrator/MissionOrchestrator'
import { insertCheckpoint, storeMissionReport } from '../db/orchestrator'
import { getSetting, setSetting } from '../db/settings'

const POLICY_KEY = 'missions.policy'
let orchestrator: MissionOrchestrator | null = null

export function getMissionPolicy(): LoopPolicy {
  return normalizeLoopPolicy(getSetting<Partial<LoopPolicy>>(POLICY_KEY, {}))
}

export function setMissionPolicy(partial: Partial<LoopPolicy>): LoopPolicy {
  const next = normalizeLoopPolicy({ ...getMissionPolicy(), ...partial })
  setSetting(POLICY_KEY, next)
  return next
}

export function initOrchestrator(runtime: AgentRuntime): void {
  orchestrator = new MissionOrchestrator(runtime, {
    policy: () => getMissionPolicy(),
    saveCheckpoint: (checkpoint) => insertCheckpoint(checkpoint),
    storeReport: (report, rendered) => {
      storeMissionReport(report, rendered.markdown)
      if (report.policy?.autoExport) {
        try {
          const dir = join(app.getPath('userData'), 'reports')
          mkdirSync(dir, { recursive: true })
          writeFileSync(join(dir, `${report.missionId}.md`), rendered.markdown)
          writeFileSync(join(dir, `${report.missionId}.json`), rendered.json)
        } catch (error) {
          console.error('[orchestrator] report export failed', error)
        }
      }
    },
    notify: (title, body) => {
      if (!getMissionPolicy().notifications) return
      try {
        new Notification({ title, body }).show()
      } catch {
        // Notifications are best-effort.
      }
    }
  })
}

export function getOrchestrator(): MissionOrchestrator {
  if (!orchestrator) throw new Error('Orchestrator not initialised')
  return orchestrator
}
