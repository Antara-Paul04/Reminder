import { Pause, Play, RotateCcw, Rocket, Square } from 'lucide-react'
import type { MissionRecord } from '@shared/types'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useRuntimeStore } from '@/stores/runtime'

/** Run / Pause / Resume / Cancel / Retry, driven by mission status. */
export function MissionControls({
  projectId,
  mission
}: {
  projectId: string
  mission: MissionRecord | null
}) {
  const startMission = useRuntimeStore((s) => s.startMission)

  if (!mission || mission.status === 'completed' || mission.status === 'cancelled') {
    return (
      <Button onClick={() => void startMission(projectId)}>
        <Rocket className="!size-4" />
        {mission ? 'Start new mission' : 'Start mission'}
      </Button>
    )
  }

  if (mission.status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={() => void api.missions.retry(mission.id)}>
          <RotateCcw className="!size-4" /> Retry
        </Button>
        <Button variant="secondary" onClick={() => void startMission(projectId)}>
          <Rocket className="!size-4" /> New mission
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {mission.status === 'running' ? (
        <Button variant="secondary" onClick={() => void api.missions.pause(mission.id)}>
          <Pause className="!size-4" /> Pause
        </Button>
      ) : (
        <Button onClick={() => void api.missions.resume(mission.id)}>
          <Play className="!size-4" /> Resume
        </Button>
      )}
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-red-400"
        onClick={() => void api.missions.cancel(mission.id)}
      >
        <Square className="!size-4" /> Cancel
      </Button>
    </div>
  )
}
