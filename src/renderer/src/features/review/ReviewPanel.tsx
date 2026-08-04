import { useEffect } from 'react'
import { Eye, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { activeSession, useReviewStore } from '@/stores/review'
import { ComparisonStage } from './ComparisonStage'
import { Gallery } from './Gallery'
import { ReviewSidebar } from './ReviewSidebar'

/**
 * The visual review workspace: reference gallery, comparison stage,
 * annotations, score sheet and history — a Figma-Inspect-style surface
 * that human reviewers drive today and vision providers will drive later.
 */
export function ReviewPanel({ projectId }: { projectId: string }) {
  const { init, screenshots, sessions, iterations, referenceId, currentId, startReview } =
    useReviewStore()
  const session = activeSession({ sessions })
  const iteration = iterations[0] ?? null

  useEffect(() => {
    void init(projectId)
  }, [projectId, init])

  const reference = screenshots.find((s) => s.id === referenceId) ?? null
  const current = screenshots.find((s) => s.id === currentId) ?? null

  return (
    <div className="flex h-full min-w-0">
      <Gallery />

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-2 flex shrink-0 items-center gap-2">
          {iteration ? (
            <>
              <span className="text-[13px] font-medium">Iteration {iteration.index}</span>
              <Badge
                variant={
                  iteration.status === 'approved'
                    ? 'success'
                    : iteration.status === 'rejected'
                      ? 'danger'
                      : 'secondary'
                }
                className="capitalize"
              >
                {iteration.status}
              </Badge>
            </>
          ) : (
            <span className="text-[13px] text-muted-foreground">No iterations yet</span>
          )}

          {session ? (
            <Badge className="ml-auto border-transparent bg-primary/15 text-primary">
              <Eye className="mr-1 h-3 w-3" /> Review in progress
            </Badge>
          ) : (
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => void startReview()}
              disabled={screenshots.filter((s) => s.role === 'current').length === 0}
            >
              <Play className="!size-3.5" /> Start review
            </Button>
          )}
        </div>

        <div className={cn('flex min-h-0 flex-1 flex-col')}>
          <ComparisonStage reference={reference} current={current} />
        </div>
      </div>

      <ReviewSidebar session={session} />
    </div>
  )
}
