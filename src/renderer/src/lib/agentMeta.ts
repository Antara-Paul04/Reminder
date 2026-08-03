import type { AgentStatus, MissionStatus } from '@shared/types'

interface StatusMeta {
  label: string
  /** Tailwind classes for the status dot. */
  dot: string
  /** Tailwind classes for status text. */
  text: string
}

export const AGENT_STATUS_META: Record<AgentStatus, StatusMeta> = {
  idle: { label: 'Idle', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
  thinking: { label: 'Thinking', dot: 'bg-violet-400 animate-pulse', text: 'text-violet-300' },
  working: { label: 'Working', dot: 'bg-primary animate-pulse', text: 'text-primary' },
  waiting: { label: 'Waiting', dot: 'bg-amber-400', text: 'text-amber-300' },
  reviewing: { label: 'Reviewing', dot: 'bg-sky-400 animate-pulse', text: 'text-sky-300' },
  complete: { label: 'Complete', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  failed: { label: 'Failed', dot: 'bg-red-400', text: 'text-red-300' }
}

export const MISSION_STATUS_META: Record<MissionStatus, { label: string; badge: string }> = {
  running: { label: 'Running', badge: 'bg-primary/15 text-primary' },
  paused: { label: 'Paused', badge: 'bg-amber-500/15 text-amber-300' },
  completed: { label: 'Completed', badge: 'bg-emerald-500/15 text-emerald-300' },
  failed: { label: 'Needs attention', badge: 'bg-red-500/15 text-red-300' },
  cancelled: { label: 'Cancelled', badge: 'bg-secondary text-muted-foreground' }
}
