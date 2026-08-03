import { StickyNote } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { DocListEditor } from '@/features/docs/DocListEditor'
import { useProjectData } from '@/hooks/useProjectData'
import { api } from '@/lib/api'
import { refreshTimeline } from '@/stores/timeline'

export function NotesPanel({ projectId }: { projectId: string }) {
  const { items, reload } = useProjectData(projectId, api.notes.list)

  return (
    <DocListEditor
      items={items}
      listLabel="Notes"
      titlePlaceholder="Note title"
      contentPlaceholder="Jot down thoughts, direction, feedback…"
      empty={
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Capture rough thinking, direction and reminders for this template."
        />
      }
      onCreate={async () => {
        const note = await api.notes.create(projectId)
        await reload()
        refreshTimeline(projectId)
        return note
      }}
      onSave={async (id, title, content) => {
        await api.notes.update(id, title, content)
        await reload()
      }}
      onDelete={async (id) => {
        await api.notes.remove(id)
        await reload()
        refreshTimeline(projectId)
      }}
    />
  )
}
