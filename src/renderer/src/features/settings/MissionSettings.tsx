import { useEffect, useRef, useState } from 'react'
import type { LoopPolicy } from '@shared/types'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

/** Settings → Missions: the autonomous loop policy. */
export function MissionSettings() {
  const [policy, setPolicy] = useState<LoopPolicy | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void api.missions.policyGet().then(setPolicy)
  }, [])

  const patch = (partial: Partial<LoopPolicy>) => {
    setPolicy((p) => (p ? { ...p, ...partial } : p))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void api.missions.policySet(partial).then(setPolicy), 500)
  }

  if (!policy) return null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        The autonomous loop drives missions from brief to approved build without intervention:
        build → review → revision plan → rebuild, until the quality gate passes or a limit stops
        it. Provider-agnostic — the loop never knows what powers an agent.
      </p>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Row label="Autonomous loop" hint="off = classic manual retries">
          <Toggle checked={policy.autonomous} onChange={(v) => patch({ autonomous: v })} />
        </Row>
        <Row label="Maximum iterations" hint="build → review cycles per mission">
          <NumberInput
            value={policy.maxIterations}
            min={1}
            max={10}
            onChange={(v) => patch({ maxIterations: v })}
          />
        </Row>
        <Row label="Maximum runtime (minutes)">
          <NumberInput
            value={Math.round(policy.maxDurationMs / 60000)}
            min={1}
            max={240}
            onChange={(v) => patch({ maxDurationMs: v * 60000 })}
          />
        </Row>
        <Row label="Quality threshold" hint="min QA score 0–10; empty = verdict only">
          <Input
            type="number"
            min={0}
            max={10}
            step={0.5}
            className="h-7 w-20 text-center text-xs"
            value={policy.qualityThreshold ?? ''}
            placeholder="—"
            onChange={(e) =>
              patch({ qualityThreshold: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </Row>
        <Row label="Error retries" hint="automatic retries on agent failures">
          <NumberInput
            value={policy.retry.maxRetries}
            min={0}
            max={5}
            onChange={(v) => patch({ retry: { ...policy.retry, maxRetries: v } })}
          />
        </Row>
        <Row label="Stop on failure" hint="halt instead of retrying agent errors">
          <Toggle checked={policy.stopOnFailure} onChange={(v) => patch({ stopOnFailure: v })} />
        </Row>
        <Row label="Require manual approval" hint="park passing builds for your sign-off">
          <Toggle
            checked={policy.requireManualApproval}
            onChange={(v) => patch({ requireManualApproval: v })}
          />
        </Row>
        <Row label="Auto-export reports" hint="write .md + .json on completion">
          <Toggle checked={policy.autoExport} onChange={(v) => patch({ autoExport: v })} />
        </Row>
        <Row label="Notifications" hint="OS notification when a mission settles">
          <Toggle checked={policy.notifications} onChange={(v) => patch({ notifications: v })} />
        </Row>
      </div>
    </div>
  )
}

function Row({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-4 py-2.5 last:border-b-0">
      <div>
        <p className="text-[13px]">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-secondary'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  )
}

function NumberInput({
  value,
  min,
  max,
  onChange
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      className="h-7 w-20 text-center text-xs"
      value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
    />
  )
}
