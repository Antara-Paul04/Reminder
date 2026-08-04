import { useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import type { ScreenshotArtifactMeta, ScreenshotRole } from '@shared/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { imageFilesFromDrop } from '@/lib/files'
import { cn, mediaUrl } from '@/lib/utils'
import { useReviewStore } from '@/stores/review'

/** Reference + current-build thumbnails; click selects a comparison side. */
export function Gallery() {
  const { screenshots, referenceId, currentId, select, importFiles, removeScreenshot } =
    useReviewStore()

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r">
      <ScrollArea className="min-h-0 flex-1">
        <GallerySection
          title="Reference"
          role="reference"
          items={screenshots.filter((s) => s.role === 'reference')}
          selectedId={referenceId}
          onSelect={(id) => select('reference', id)}
          onImport={(files) => void importFiles(files, 'reference')}
          onRemove={(id) => void removeScreenshot(id)}
        />
        <GallerySection
          title="Current build"
          role="current"
          items={screenshots.filter((s) => s.role === 'current')}
          selectedId={currentId}
          onSelect={(id) => select('current', id)}
          onImport={(files) => void importFiles(files, 'current')}
          onRemove={(id) => void removeScreenshot(id)}
        />
      </ScrollArea>
    </div>
  )
}

function GallerySection({
  title,
  role,
  items,
  selectedId,
  onSelect,
  onImport,
  onRemove
}: {
  title: string
  role: ScreenshotRole
  items: ScreenshotArtifactMeta[]
  selectedId: string | null
  onSelect: (id: string) => void
  onImport: (files: File[]) => void
  onRemove: (id: string) => void
}) {
  const [dragging, setDragging] = useState(false)

  const pick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => onImport(Array.from(input.files ?? []))
    input.click()
  }

  return (
    <div
      className={cn('px-2 py-3', dragging && 'bg-primary/5')}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        onImport(imageFilesFromDrop(e))
      }}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <button
          onClick={pick}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={`Import ${role} screenshots`}
        >
          <Upload className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((shot) => (
          <button
            key={shot.id}
            onClick={() => onSelect(shot.id)}
            className={cn(
              'group relative overflow-hidden rounded-md border text-left transition-colors',
              shot.id === selectedId
                ? 'border-primary/60 ring-1 ring-primary/40'
                : 'border-border hover:border-border/80'
            )}
          >
            <img
              src={mediaUrl(shot.filePath)}
              alt={shot.label}
              className="aspect-video w-full object-cover object-top"
              draggable={false}
            />
            <div className="flex items-center gap-1.5 border-t bg-card px-2 py-1">
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {shot.label}
              </span>
              <span className="shrink-0 rounded border border-border px-1 text-[9px] uppercase text-muted-foreground/70">
                {shot.viewport}
              </span>
              {shot.role === 'current' && (
                <span className="shrink-0 text-[9px] text-muted-foreground/70">it{shot.iteration}</span>
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(shot.id)
                }}
                className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </span>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <p className="px-1 py-2 text-[11px] leading-relaxed text-muted-foreground/70">
            Drop images here or use the upload button.
          </p>
        )}
      </div>
    </div>
  )
}
