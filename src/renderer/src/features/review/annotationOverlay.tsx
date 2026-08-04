import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useReviewStore } from '@/stores/review'

/** Numbered coordinate markers for one screenshot's annotations. */
export function AnnotationMarkers({ screenshotId }: { screenshotId: string }) {
  const annotations = useReviewStore((s) => s.annotations).filter(
    (a) => a.screenshotId === screenshotId
  )

  return (
    <>
      {annotations.map((annotation, index) => (
        <div
          key={annotation.id}
          title={annotation.text}
          className={cn(
            'absolute z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-semibold shadow',
            annotation.resolved
              ? 'border-emerald-500/60 bg-emerald-500/25 text-emerald-200'
              : annotation.severity === 'high'
                ? 'border-red-400/70 bg-red-500/30 text-red-100'
                : 'border-primary/70 bg-primary/30 text-primary-foreground'
          )}
          style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }}
        >
          {index + 1}
        </div>
      ))}
    </>
  )
}

export interface DraftAnnotation {
  x: number
  y: number
  clientX: number
  clientY: number
}

/** Inline note editor shown at the clicked point. */
export function DraftAnnotationForm({
  draft,
  stageRef,
  screenshotId,
  onClose
}: {
  draft: DraftAnnotation
  stageRef: React.RefObject<HTMLDivElement | null>
  screenshotId: string
  onClose: () => void
}) {
  const annotate = useReviewStore((s) => s.annotate)
  const [text, setText] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')

  const rect = stageRef.current?.getBoundingClientRect()
  const left = rect ? Math.min(draft.clientX - rect.left, rect.width - 280) : 40
  const top = rect ? Math.min(draft.clientY - rect.top + 10, rect.height - 120) : 40

  const submit = async () => {
    if (!text.trim()) return
    await annotate({ screenshotId, x: draft.x, y: draft.y, text: text.trim(), severity })
    onClose()
  }

  return (
    <div
      className="absolute z-30 w-[270px] rounded-lg border bg-popover p-2.5 shadow-xl animate-fade-in"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Input
        autoFocus
        placeholder="What needs attention here?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit()
          if (e.key === 'Escape') onClose()
        }}
      />
      <div className="mt-2 flex items-center gap-1">
        {(['low', 'medium', 'high'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setSeverity(level)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] capitalize transition-colors',
              severity === level
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {level}
          </button>
        ))}
        <Button size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => void submit()} disabled={!text.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}
