import { useDashboard } from '@/lib/queries'

export function Topbar() {
  const { data } = useDashboard()
  const wm = data?.wm

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-border bg-background/85 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
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
