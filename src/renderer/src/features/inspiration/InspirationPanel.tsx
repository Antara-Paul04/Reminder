import { useState } from 'react'
import { Globe, Image as ImageIcon, Link2, Plus, Trash2, Upload } from 'lucide-react'
import type { InspirationItem } from '@shared/types'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProjectData } from '@/hooks/useProjectData'
import { api } from '@/lib/api'
import { imageFilesFromDrop, toFileUpload } from '@/lib/files'
import { cn, mediaUrl } from '@/lib/utils'
import { refreshTimeline } from '@/stores/timeline'

export function InspirationPanel({ projectId }: { projectId: string }) {
  const { items, reload } = useProjectData(projectId, api.inspiration.list)
  const [url, setUrl] = useState('')
  const [dragging, setDragging] = useState(false)

  const addFiles = async (files: File[]) => {
    for (const file of files) {
      await api.inspiration.addImage(projectId, await toFileUpload(file))
    }
    await reload()
    refreshTimeline(projectId)
  }

  const addUrl = async () => {
    const value = url.trim()
    if (!value) return
    await api.inspiration.addUrl(projectId, value.startsWith('http') ? value : `https://${value}`)
    setUrl('')
    await reload()
    refreshTimeline(projectId)
  }

  const removeItem = async (id: string) => {
    await api.inspiration.remove(id)
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
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        <div className="relative flex-1 max-w-sm">
          <Link2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Paste a website URL for reference…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUrl()}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={addUrl} disabled={!url.trim()}>
          <Plus className="!size-3.5" /> Add URL
        </Button>
        <Button variant="secondary" size="sm" onClick={pickFiles}>
          <Upload className="!size-3.5" /> Upload
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No inspiration yet"
          description="Drag and drop images anywhere in this panel, or paste website URLs to build the moodboard."
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <InspirationCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
            ))}
          </div>
        </ScrollArea>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 backdrop-blur-[1px]">
          <p className="text-[13px] font-medium text-primary">Drop images to add inspiration</p>
        </div>
      )}
    </div>
  )
}

function InspirationCard({ item, onRemove }: { item: InspirationItem; onRemove: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:border-border/80 animate-fade-in">
      {item.kind === 'image' && item.filePath ? (
        <img
          src={mediaUrl(item.filePath)}
          alt={item.title}
          className="aspect-[4/3] w-full object-cover"
          draggable={false}
        />
      ) : (
        <button
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 px-3 text-center"
          onClick={() => item.url && window.open(item.url, '_blank')}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
            <Globe className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="max-w-full truncate text-xs text-muted-foreground underline-offset-2 hover:underline">
            {item.url}
          </span>
        </button>
      )}
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-t px-2.5 py-1.5',
          'text-xs text-muted-foreground'
        )}
      >
        <span className="truncate">{item.title}</span>
        <button
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-secondary hover:text-red-400 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
