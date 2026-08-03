import { useState } from 'react'
import { Camera, Trash2, Upload } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProjectData } from '@/hooks/useProjectData'
import { api } from '@/lib/api'
import { imageFilesFromDrop, toFileUpload } from '@/lib/files'
import { relativeTime } from '@/lib/format'
import { mediaUrl } from '@/lib/utils'
import { useRuntimeStore } from '@/stores/runtime'
import { refreshTimeline } from '@/stores/timeline'

export function ScreenshotsPanel({ projectId }: { projectId: string }) {
  const artifactVersion = useRuntimeStore((s) => s.artifactVersion)
  const { items, reload } = useProjectData(projectId, api.screenshots.list, artifactVersion)
  const [dragging, setDragging] = useState(false)

  const addFiles = async (files: File[]) => {
    for (const file of files) {
      await api.screenshots.add(projectId, await toFileUpload(file))
    }
    await reload()
    refreshTimeline(projectId)
  }

  const remove = async (id: string) => {
    await api.screenshots.remove(id)
    await reload()
    refreshTimeline(projectId)
  }

  const pickFiles = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => void addFiles(Array.from(input.files ?? []))
    input.click()
  }

  return (
    <div
      className="relative flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void addFiles(imageFilesFromDrop(e))
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          Build previews, newest first. Agents capture these during missions; you can add your own.
        </p>
        <Button variant="secondary" size="sm" onClick={pickFiles}>
          <Upload className="!size-3.5" /> Add screenshot
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No screenshots yet"
          description="Screenshots of the template as it evolves will live here — a visual history of the build."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
            {items.map((shot) => (
              <div
                key={shot.id}
                className="group overflow-hidden rounded-lg border bg-card animate-fade-in"
              >
                <img
                  src={mediaUrl(shot.filePath)}
                  alt={shot.label}
                  className="aspect-video w-full object-cover object-top"
                  draggable={false}
                />
                <div className="flex items-center justify-between gap-2 border-t px-2.5 py-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{shot.label || 'Screenshot'}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/70">
                    {relativeTime(shot.createdAt)}
                  </span>
                  <button
                    onClick={() => remove(shot.id)}
                    className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-secondary hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 backdrop-blur-[1px]">
          <p className="text-[13px] font-medium text-primary">Drop screenshots to add them</p>
        </div>
      )}
    </div>
  )
}
