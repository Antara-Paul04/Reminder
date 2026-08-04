import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, Plug, Rocket, Settings2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui'
import { AgentsSection } from './AgentsSection'
import { GeneralSection } from './GeneralSection'
import { MissionSettings } from './MissionSettings'
import { ProvidersSection } from './ProvidersSection'

type Section = 'providers' | 'agents' | 'missions' | 'general'

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'missions', label: 'Missions', icon: Rocket },
  { id: 'general', label: 'General', icon: Settings2 }
]

export function SettingsPage() {
  const setView = useUiStore((s) => s.setView)
  const [section, setSection] = useState<Section>('providers')

  // Escape returns to the workspace.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setView('workspace')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setView])

  return (
    <div className="flex h-full flex-col bg-card/40 animate-fade-in">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => setView('workspace')}>
          <ArrowLeft className="!size-4" />
        </Button>
        <h1 className="text-[15px] font-semibold tracking-tight">Settings</h1>
        <span className="ml-auto text-[11px] text-muted-foreground">Esc to close</span>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-48 shrink-0 flex-col gap-0.5 border-r p-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                section === id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-2xl p-6">
            {section === 'providers' && <ProvidersSection />}
            {section === 'agents' && <AgentsSection />}
            {section === 'missions' && <MissionSettings />}
            {section === 'general' && <GeneralSection />}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
