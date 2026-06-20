import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDashboard } from '@/lib/queries'

export function Sidebar() {
  const { data } = useDashboard()
  const pending = data?.stats.pending_suggestions ?? 0

  const nav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/alerts', label: 'Action queue', icon: Inbox, badge: pending },
  ]

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary font-display text-base font-semibold text-sidebar-primary-foreground">
          W
        </div>
        <div className="leading-tight">
          <div className="font-display text-sm font-semibold tracking-tight">
            Wealth Advisory
          </div>
          <div className="eyebrow !text-sidebar-foreground/55">Workbench</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        <div className="eyebrow mb-2 px-3 !text-sidebar-foreground/45">
          Navigation
        </div>
        {nav.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span className="tnum flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary/90 px-1.5 text-xs font-semibold text-sidebar-primary-foreground">
                    {badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 text-sidebar-foreground/55">
        <div className="eyebrow !text-sidebar-foreground/45">Human in the loop</div>
        <p className="mt-1.5 text-xs leading-relaxed">
          The WM recommends. The client always decides and places the orders.
        </p>
      </div>
    </aside>
  )
}
