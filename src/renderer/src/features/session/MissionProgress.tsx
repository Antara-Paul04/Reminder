import type { MissionRecord } from '@shared/types'
import { MISSION_STAGES, STAGE_LABELS } from '@shared/types'
import { cn } from '@/lib/utils'

/** Animated stage progress: Research → … → Complete. */
export function MissionProgress({ mission }: { mission: MissionRecord }) {
  const currentIndex = MISSION_STAGES.indexOf(mission.stage)
  const failed = mission.status === 'failed'

  return (
    <div className="flex items-center gap-1.5">
      {MISSION_STAGES.map((stage, index) => {
        const reached = index <= currentIndex
        const isCurrent = index === currentIndex && mission.status !== 'completed'
        return (
          <div key={stage} className="flex flex-1 flex-col gap-1.5">
            <div
              className={cn(
                'h-1 rounded-full transition-colors duration-500',
                reached
                  ? failed && isCurrent
                    ? 'bg-red-400'
                    : 'bg-primary'
                  : 'bg-secondary',
                isCurrent && mission.status === 'running' && 'animate-pulse'
              )}
            />
            <span
              className={cn(
                'truncate text-[10px] font-medium uppercase tracking-wide transition-colors',
                reached ? (failed && isCurrent ? 'text-red-300' : 'text-foreground/80') : 'text-muted-foreground/50'
              )}
            >
              {STAGE_LABELS[stage]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
