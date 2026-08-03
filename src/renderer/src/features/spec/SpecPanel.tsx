import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { DocListEditor } from '@/features/docs/DocListEditor'
import { useProjectData } from '@/hooks/useProjectData'
import { api } from '@/lib/api'
import { refreshTimeline } from '@/stores/timeline'

export function SpecPanel({ projectId }: { projectId: string }) {
  const { items, reload } = useProjectData(projectId, api.specs.list)

  return (
    <DocListEditor
      items={items}
      listLabel="Specs"
      titlePlaceholder="Spec title"
      contentPlaceholder="Write the prompt or spec that will drive the build. In Phase 2 the Creative Director drafts these from your brief and inspiration."
      contentClassName="font-mono text-xs"
      empty={
        <EmptyState
          icon={FileText}
          title="No specs yet"
          description="Specs are the source of truth handed to the Engineer. Write one by hand, or let the Creative Director generate it in Phase 2."
        />
      }
      renderMeta={(spec) => (
        <Badge variant="secondary" className="shrink-0">
          {spec.author === 'you' ? 'Authored by you' : spec.author}
        </Badge>
      )}
      onCreate={async () => {
        const spec = await api.specs.create(projectId, 'Untitled spec')
        await reload()
        refreshTimeline(projectId)
        return spec
      }}
      onSave={async (id, title, content) => {
        await api.specs.update(id, title, content)
        await reload()
      }}
      onDelete={async (id) => {
        await api.specs.remove(id)
        await reload()
        refreshTimeline(projectId)
      }}
    />
  )
}
