import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/types'
import { api } from '@/lib/api'

/** App-level information and fixed preferences. */
export function GeneralSection() {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void api.app.info().then(setInfo)
  }, [])

  const rows: [string, string][] = [
    ['Version', info?.version ?? '…'],
    ['Data location', info?.dataDir ?? '…'],
    ['Theme', 'Dark (fixed)'],
    ['Simulation speed', 'Set AI_STUDIO_SIM_SPEED before launch (e.g. 0.2 = 5× faster)']
  ]

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={
            'flex items-baseline justify-between gap-6 px-4 py-3 ' +
            (index > 0 ? 'border-t' : '')
          }
        >
          <span className="shrink-0 text-[13px]">{label}</span>
          <span className="truncate text-right text-xs text-muted-foreground">{value}</span>
        </div>
      ))}
    </div>
  )
}
