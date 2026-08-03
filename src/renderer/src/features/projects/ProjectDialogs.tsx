import { useEffect, useState } from 'react'
import type { Project } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useProjectStore } from '@/stores/projects'
import { refreshTimeline } from '@/stores/timeline'
import { useUiStore } from '@/stores/ui'

export function NewProjectDialog() {
  const open = useUiStore((s) => s.newProjectOpen)
  const setOpen = useUiStore((s) => s.setNewProjectOpen)
  const create = useProjectStore((s) => s.create)
  const [name, setName] = useState('')
  const [brief, setBrief] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setBrief('')
    }
  }, [open])

  const submit = async () => {
    if (!name.trim()) return
    const project = await create(name.trim(), brief.trim())
    refreshTimeline(project.id)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Start a new template build. You can refine the brief anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            autoFocus
            placeholder="Project name — e.g. Nova, a SaaS landing template"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Textarea
            placeholder="Short design brief — audience, mood, references…"
            rows={4}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RenameProjectDialog({
  project,
  onClose
}: {
  project: Project | null
  onClose: () => void
}) {
  const rename = useProjectStore((s) => s.rename)
  const [name, setName] = useState('')

  useEffect(() => {
    if (project) setName(project.name)
  }, [project])

  const submit = async () => {
    if (!project || !name.trim()) return
    await rename(project.id, name.trim())
    refreshTimeline(project.id)
    onClose()
  }

  return (
    <Dialog open={project !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteProjectDialog({
  project,
  onClose
}: {
  project: Project | null
  onClose: () => void
}) {
  const remove = useProjectStore((s) => s.remove)

  const submit = async () => {
    if (!project) return
    await remove(project.id)
    onClose()
  }

  return (
    <Dialog open={project !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{project?.name}”?</DialogTitle>
          <DialogDescription>
            This permanently removes the project, its notes, specs, inspiration and screenshots.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit}>
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
