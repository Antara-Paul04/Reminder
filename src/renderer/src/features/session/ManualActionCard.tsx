import { useEffect, useState } from 'react'
import { Check, ClipboardCopy, ClipboardPaste, ExternalLink } from 'lucide-react'
import type { PendingManualRequest } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { useRuntimeStore } from '@/stores/runtime'

/**
 * The hand-off surface for manual providers: preview the generated prompt,
 * copy it, open the external AI, and import its response to resume the
 * mission. Appears automatically when a manual provider parks in 'waiting'.
 */
export function ManualActionCard({ pending }: { pending: PendingManualRequest }) {
  const agents = useRuntimeStore((s) => s.agents)
  const [copied, setCopied] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const agentName = agents.find((a) => a.id === pending.agentId)?.name ?? pending.agentId

  const copy = async () => {
    await api.manual.copy(pending.providerId, pending.sessionId)
    setCopied(true)
  }

  return (
    <div className="shrink-0 border-t bg-card/60 p-3 animate-fade-in">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        <p className="text-[13px] font-medium">
          {agentName} needs {pending.destinationLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          — paste the prompt there, then import the reply
        </p>
      </div>

      <div className="mb-2.5 max-h-40 overflow-y-auto rounded-md border bg-background/80 p-3">
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
          {pending.prompt}
        </pre>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? <Check className="!size-3.5 text-emerald-400" /> : <ClipboardCopy className="!size-3.5" />}
          {copied ? 'Copied' : 'Copy prompt'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void api.manual.open(pending.providerId)}
        >
          <ExternalLink className="!size-3.5" /> Open {pending.destinationLabel}
        </Button>
        <Button size="sm" className="ml-auto" onClick={() => setImportOpen(true)}>
          <ClipboardPaste className="!size-3.5" /> Import response
        </Button>
      </div>

      <ImportResponseDialog pending={pending} open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

function ImportResponseDialog({
  pending,
  open,
  onOpenChange
}: {
  pending: PendingManualRequest
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setResponse('')
      setError(null)
    }
  }, [open])

  const submit = async () => {
    try {
      await api.manual.import(pending.providerId, pending.sessionId, response)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import response from {pending.destinationLabel}</DialogTitle>
          <DialogDescription>
            Paste the full reply. AI Studio parses headings like “# Creative Spec”, “# Build
            Plan” and “# QA” into artifacts and resumes the mission.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={12}
          className="font-mono text-xs"
          placeholder="Paste the response here…"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!response.trim()}>
            Continue mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
