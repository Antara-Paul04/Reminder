import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface DocLike {
  id: string
  title: string
  content: string
  updatedAt: number
}

interface DocListEditorProps<T extends DocLike> {
  items: T[]
  listLabel: string
  titlePlaceholder: string
  contentPlaceholder: string
  contentClassName?: string
  empty: React.ReactNode
  renderMeta?: (item: T) => React.ReactNode
  onCreate: () => Promise<T>
  onSave: (id: string, title: string, content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

/**
 * Shared master–detail editor: list of documents on the left, a debounced
 * autosaving editor on the right. Used by both Notes and Specs.
 */
export function DocListEditor<T extends DocLike>({
  items,
  listLabel,
  titlePlaceholder,
  contentPlaceholder,
  contentClassName,
  empty,
  renderMeta,
  onCreate,
  onSave,
  onDelete
}: DocListEditorProps<T>) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const pending = useRef<{ id: string; title: string; content: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = items.find((i) => i.id === selectedId) ?? null

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    const p = pending.current
    if (p) {
      pending.current = null
      await onSave(p.id, p.title, p.content)
    }
  }, [onSave])

  // Keep a valid selection as items load, reorder, or get deleted.
  useEffect(() => {
    if (!items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null)
    }
  }, [items, selectedId])

  // Load the draft whenever the selection changes; flush the previous one.
  useEffect(() => {
    void flush()
    const item = items.find((i) => i.id === selectedId)
    setTitle(item?.title ?? '')
    setContent(item?.content ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => () => void flush(), [flush])

  const schedule = (nextTitle: string, nextContent: string) => {
    if (!selectedId) return
    pending.current = { id: selectedId, title: nextTitle, content: nextContent }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), 600)
  }

  const create = async () => {
    await flush()
    const item = await onCreate()
    setSelectedId(item.id)
  }

  const removeSelected = async () => {
    if (!selected) return
    pending.current = null
    if (timer.current) clearTimeout(timer.current)
    await onDelete(selected.id)
  }

  return (
    <div className="flex h-full">
      <div className="flex w-56 shrink-0 flex-col border-r">
        <div className="flex h-10 shrink-0 items-center justify-between border-b pl-3 pr-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {listLabel}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={create}>
            <Plus className="!size-3.5" />
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-0.5 p-1.5">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors',
                  item.id === selectedId
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <span className="w-full truncate text-[13px]">
                  {(item.id === selectedId ? title : item.title) || 'Untitled'}
                </span>
                <span className="text-[11px] text-muted-foreground/70">
                  {relativeTime(item.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {selected ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
            <input
              value={title}
              placeholder={titlePlaceholder}
              onChange={(e) => {
                setTitle(e.target.value)
                schedule(e.target.value, content)
              }}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground/60"
            />
            {renderMeta?.(selected)}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-red-400"
              onClick={removeSelected}
            >
              <Trash2 className="!size-4" />
            </Button>
          </div>
          <textarea
            value={content}
            placeholder={contentPlaceholder}
            onChange={(e) => {
              setContent(e.target.value)
              schedule(title, e.target.value)
            }}
            className={cn(
              'min-h-0 flex-1 resize-none bg-transparent p-4 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/60',
              contentClassName
            )}
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1">{empty}</div>
      )}
    </div>
  )
}
