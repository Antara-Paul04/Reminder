import { useCallback, useRef, useState } from 'react'
import { Columns2, Maximize2, Minimize2, MousePointerClick, SquareSplitHorizontal, ZoomIn, ZoomOut } from 'lucide-react'
import type { ScreenshotArtifactMeta } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, mediaUrl } from '@/lib/utils'
import { activeSession, useReviewStore } from '@/stores/review'
import { AnnotationMarkers, DraftAnnotationForm, type DraftAnnotation } from './annotationOverlay'

/**
 * Reference vs current comparison: side-by-side and slider modes, zoom,
 * pan, fullscreen, and coordinate-anchored annotation on the current build.
 */
export function ComparisonStage({
  reference,
  current
}: {
  reference: ScreenshotArtifactMeta | null
  current: ScreenshotArtifactMeta | null
}) {
  const { mode, setMode, fullscreen, setFullscreen, annotating, setAnnotating, sessions } =
    useReviewStore()
  const session = activeSession({ sessions })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [slider, setSlider] = useState(0.5)
  const [draft, setDraft] = useState<DraftAnnotation | null>(null)
  const dragState = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const sliderDrag = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (annotating || sliderDrag.current) return
    dragState.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (sliderDrag.current && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect()
      setSlider(Math.min(0.98, Math.max(0.02, (e.clientX - rect.left) / rect.width)))
      return
    }
    if (!dragState.current) return
    setPan({
      x: dragState.current.panX + (e.clientX - dragState.current.x),
      y: dragState.current.panY + (e.clientY - dragState.current.y)
    })
  }
  const endPointer = () => {
    dragState.current = null
    sliderDrag.current = false
  }

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(4, Math.max(0.4, z - e.deltaY * 0.0015)))
  }

  /** Click on the current build → normalized coordinates → draft note. */
  const onAnnotateClick = useCallback(
    (e: React.MouseEvent, image: HTMLElement) => {
      if (!annotating || !session || !current) return
      const rect = image.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      if (x < 0 || x > 1 || y < 0 || y > 1) return
      setDraft({ x, y, clientX: e.clientX, clientY: e.clientY })
    },
    [annotating, session, current]
  )

  const stage = (
    <div className={cn('flex min-h-0 flex-1 flex-col', fullscreen && 'fixed inset-0 z-50 bg-background p-3')}>
      <div className="flex shrink-0 items-center gap-1 pb-2">
        <ModeButton
          active={mode === 'side-by-side'}
          onClick={() => setMode('side-by-side')}
          icon={Columns2}
          label="Side by side"
        />
        <ModeButton
          active={mode === 'slider'}
          onClick={() => setMode('slider')}
          icon={SquareSplitHorizontal}
          label="Slider"
        />
        <div className="mx-2 h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>
          <ZoomOut className="!size-3.5" />
        </Button>
        <button onClick={resetView} className="min-w-[44px] text-center text-[11px] text-muted-foreground hover:text-foreground">
          {Math.round(zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>
          <ZoomIn className="!size-3.5" />
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={annotating ? 'default' : 'ghost'}
              size="sm"
              disabled={!session}
              onClick={() => setAnnotating(!annotating)}
            >
              <MousePointerClick className="!size-3.5" /> Annotate
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {session ? 'Click anywhere on the current build to leave a note' : 'Start a review first'}
          </TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setFullscreen(!fullscreen)}>
          {fullscreen ? <Minimize2 className="!size-4" /> : <Maximize2 className="!size-4" />}
        </Button>
      </div>

      <div
        ref={stageRef}
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-background/60',
          annotating ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerLeave={endPointer}
        onWheel={onWheel}
      >
        <div
          className="absolute inset-0 origin-center transition-transform duration-75"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {mode === 'side-by-side' ? (
            <div className="flex h-full gap-2 p-3">
              <Pane label="Reference" shot={reference} />
              <Pane label="Current" shot={current} onClick={onAnnotateClick} withMarkers />
            </div>
          ) : (
            <SliderView reference={reference} current={current} slider={slider} onClick={onAnnotateClick} />
          )}
        </div>

        {mode === 'slider' && (
          <div
            className="absolute inset-y-0 z-20 flex w-4 -translate-x-1/2 cursor-col-resize items-center justify-center"
            style={{ left: `${slider * 100}%` }}
            onPointerDown={(e) => {
              e.stopPropagation()
              sliderDrag.current = true
            }}
          >
            <div className="h-full w-px bg-primary/70" />
            <div className="absolute h-6 w-6 rounded-full border border-primary/60 bg-background shadow" />
          </div>
        )}

        {draft && session && current && (
          <DraftAnnotationForm
            draft={draft}
            stageRef={stageRef}
            screenshotId={current.id}
            onClose={() => setDraft(null)}
          />
        )}
      </div>
    </div>
  )

  return stage
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: typeof Columns2
  label: string
}) {
  return (
    <Button variant={active ? 'secondary' : 'ghost'} size="sm" onClick={onClick}>
      <Icon className="!size-3.5" /> {label}
    </Button>
  )
}

function Pane({
  label,
  shot,
  onClick,
  withMarkers
}: {
  label: string
  shot: ScreenshotArtifactMeta | null
  onClick?: (e: React.MouseEvent, image: HTMLElement) => void
  withMarkers?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border bg-card/60">
        {shot ? (
          <div className="relative h-full w-full">
            <img
              src={mediaUrl(shot.filePath)}
              alt={shot.label}
              draggable={false}
              onClick={(e) => onClick?.(e, e.currentTarget)}
              className="h-full w-full object-contain object-top"
            />
            {withMarkers && <AnnotationMarkers screenshotId={shot.id} />}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground/60">
            No {label.toLowerCase()} selected
          </div>
        )}
      </div>
    </div>
  )
}

function SliderView({
  reference,
  current,
  slider,
  onClick
}: {
  reference: ScreenshotArtifactMeta | null
  current: ScreenshotArtifactMeta | null
  slider: number
  onClick: (e: React.MouseEvent, image: HTMLElement) => void
}) {
  return (
    <div className="relative h-full w-full p-3">
      <div className="relative h-full w-full overflow-hidden rounded-md border bg-card/60">
        {reference && (
          <img
            src={mediaUrl(reference.filePath)}
            alt={reference.label}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain object-top"
          />
        )}
        {current && (
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${(1 - slider) * 100}% 0 0)` }}
          >
            <img
              src={mediaUrl(current.filePath)}
              alt={current.label}
              draggable={false}
              onClick={(e) => onClick(e, e.currentTarget)}
              className="absolute inset-0 h-full w-full object-contain object-top"
            />
            <AnnotationMarkers screenshotId={current.id} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Current
        </span>
        <span className="absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Reference
        </span>
      </div>
    </div>
  )
}
