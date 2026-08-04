import { useEffect, useRef, useState } from 'react'
import { Check, CircleDot, Trash2 } from 'lucide-react'
import { overallScore, REVIEW_CATEGORIES, type ReviewSessionRecord } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useReviewStore } from '@/stores/review'

/** Right rail: annotations, score sheet, summary + verdict, history. */
export function ReviewSidebar({ session }: { session: ReviewSessionRecord | null }) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-3">
          {session ? (
            <>
              <AnnotationsList />
              <ScoreSheet session={session} />
              <SummaryAndVerdict session={session} />
            </>
          ) : (
            <p className="px-1 pt-1 text-xs leading-relaxed text-muted-foreground">
              Start a review to annotate the build, score design categories and record a verdict.
            </p>
          )}
          <History />
        </div>
      </ScrollArea>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

function AnnotationsList() {
  const { annotations, resolveAnnotation, deleteAnnotation } = useReviewStore()

  return (
    <div>
      <SectionTitle>Annotations · {annotations.length}</SectionTitle>
      <div className="mt-2 flex flex-col gap-1.5">
        {annotations.map((annotation, index) => (
          <div
            key={annotation.id}
            className={cn(
              'group flex items-start gap-2 rounded-md border bg-card px-2 py-1.5',
              annotation.resolved && 'opacity-55'
            )}
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-xs leading-snug', annotation.resolved && 'line-through')}>
                {annotation.text}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                {annotation.severity} · {annotation.author}
              </p>
            </div>
            <button
              onClick={() => void resolveAnnotation(annotation.id, !annotation.resolved)}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-400"
              title={annotation.resolved ? 'Reopen' : 'Resolve'}
            >
              {annotation.resolved ? <CircleDot className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            </button>
            <button
              onClick={() => void deleteAnnotation(annotation.id)}
              className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {annotations.length === 0 && (
          <p className="text-[11px] text-muted-foreground/70">
            Toggle Annotate, then click anywhere on the current build.
          </p>
        )}
      </div>
    </div>
  )
}

function ScoreSheet({ session }: { session: ReviewSessionRecord }) {
  const score = useReviewStore((s) => s.score)
  const overall = overallScore(session.scores)

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <SectionTitle>Design score</SectionTitle>
        {overall !== null && <span className="text-xs font-medium text-primary">{overall} / 10</span>}
      </div>
      <div className="mt-2 grid gap-1">
        {REVIEW_CATEGORIES.map((category) => {
          const entry = session.scores.find((s) => s.category === category)
          return (
            <ScoreRow
              key={category}
              label={category}
              value={entry?.score ?? null}
              onCommit={(value) =>
                void score({
                  category,
                  score: value,
                  notes: entry?.notes ?? '',
                  confidence: value === null ? null : 1
                })
              }
            />
          )
        })}
      </div>
    </div>
  )
}

/** Committed on blur/Enter — per-keystroke writes mangle decimals ("8.5"). */
function ScoreRow({
  label,
  value,
  onCommit
}: {
  label: string
  value: number | null
  onCommit: (value: number | null) => void
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))

  useEffect(() => setDraft(value === null ? '' : String(value)), [value])

  const commit = () => {
    const parsed = draft.trim() === '' ? null : Number(draft)
    onCommit(parsed !== null && Number.isFinite(parsed) ? parsed : null)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs capitalize text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={10}
        step={0.5}
        value={draft}
        placeholder="–"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="h-6 w-14 rounded border border-input bg-transparent px-1.5 text-center text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${((value ?? 0) / 10) * 100}%` }}
        />
      </div>
    </div>
  )
}

function SummaryAndVerdict({ session }: { session: ReviewSessionRecord }) {
  const { saveSummary, complete } = useReviewStore()
  const [summary, setSummary] = useState(session.summary)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setSummary(session.summary), [session.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (value: string) => {
    setSummary(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void saveSummary(value), 700)
  }

  return (
    <div>
      <SectionTitle>Review summary</SectionTitle>
      <Textarea
        rows={3}
        className="mt-2"
        placeholder="Overall impression, what to fix next iteration…"
        value={summary}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-1.5">
        <Button size="sm" className="flex-1" onClick={() => void complete('approve', summary)}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => void complete('revise', summary)}
        >
          Revise
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1"
          onClick={() => void complete('reject', summary)}
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

function History() {
  const sessions = useReviewStore((s) => s.sessions).filter((s) => s.status === 'completed')
  if (sessions.length === 0) return null

  return (
    <div>
      <SectionTitle>History</SectionTitle>
      <div className="mt-2 flex flex-col gap-1.5">
        {sessions.map((session) => {
          const overall = overallScore(session.scores)
          return (
            <div key={session.id} className="rounded-md border bg-card px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs">Iteration {session.iteration}</span>
                <Badge
                  variant={
                    session.recommendation === 'approve'
                      ? 'success'
                      : session.recommendation === 'reject'
                        ? 'danger'
                        : 'warning'
                  }
                  className="capitalize"
                >
                  {session.recommendation}
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground/70">
                  {overall !== null ? `${overall}/10 · ` : ''}
                  {relativeTime(session.completedAt ?? session.createdAt)}
                </span>
              </div>
              {session.summary && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {session.summary}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
