import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { useDashboard } from '@/lib/queries'

export function Topbar() {
  const { theme, toggle } = useTheme()
  const { data } = useDashboard()
  const wm = data?.wm

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-border bg-background/85 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight">
              {wm?.full_name ?? 'Wealth Manager'}
            </div>
            <div className="eyebrow">Wealth Manager</div>
          </div>
          <div className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
            {wm ? initialsOf(wm.full_name) : 'WM'}
          </div>
        </div>
      </div>
    </header>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
