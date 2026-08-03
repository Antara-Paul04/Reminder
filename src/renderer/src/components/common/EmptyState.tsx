import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-1 p-8 text-center animate-fade-in',
        className
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary/50">
        <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium">{title}</p>
      <p className="max-w-[300px] text-xs leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
