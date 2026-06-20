import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

import { useCompleteTask } from '@/lib/queries'
import { channelLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/api-types'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-muted-foreground',
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function relativeDay(iso: string): string {
  const today = ymd(new Date())
  const t = new Date()
  t.setDate(t.getDate() + 1)
  const tomorrow = ymd(t)
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  return new Intl.DateTimeFormat('en-CH', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(iso))
}

export function TasksCalendar({ tasks }: { tasks: Task[] }) {
  const open = useMemo(
    () => tasks.filter((t) => t.status === 'open'),
    [tasks],
  )
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const complete = useCompleteTask()

  const countByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of open) map.set(t.due_date, (map.get(t.due_date) ?? 0) + 1)
    return map
  }, [open])

  const todayStr = ymd(now)
  const first = new Date(view.y, view.m, 1)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      ymd(new Date(view.y, view.m, i + 1)),
    ),
  ]

  const agenda = (selected ? open.filter((t) => t.due_date === selected) : open)
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
    setSelected(null)
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {/* Mini month */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-sm font-semibold">
            {new Intl.DateTimeFormat('en-CH', { month: 'long', year: 'numeric' }).format(first)}
          </span>
          <div className="flex gap-1">
            <button onClick={() => shift(-1)} className="rounded p-1 hover:bg-muted" aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => shift(1)} className="rounded p-1 hover:bg-muted" aria-label="Next month">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="eyebrow py-1">{w}</div>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} />
            const n = countByDay.get(iso) ?? 0
            const day = Number(iso.slice(8))
            const isToday = iso === todayStr
            const isSelected = iso === selected
            return (
              <button
                key={iso}
                onClick={() => setSelected(isSelected ? null : iso)}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-md text-xs transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                      ? 'bg-accent/10 font-semibold text-accent'
                      : n > 0
                        ? 'font-medium hover:bg-muted'
                        : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {day}
                {n > 0 && !isSelected ? (
                  <span className="absolute bottom-1 size-1 rounded-full bg-accent" />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Agenda */}
      <div>
        <div className="eyebrow mb-2">
          {selected ? relativeDay(selected) : `Upcoming · ${open.length}`}
        </div>
        {agenda.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing scheduled.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {agenda.slice(0, 6).map((t) => (
              <li
                key={t.id}
                className="group flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', PRIORITY_DOT[t.priority])} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium leading-tight">
                    {t.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {relativeDay(t.due_date)}
                    {t.customer_name ? ` · ${t.customer_name}` : ''}
                    {t.channel ? ` · ${channelLabel[t.channel]}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => complete.mutate(t.id)}
                  disabled={complete.isPending}
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground opacity-0 transition-opacity hover:border-success hover:text-success group-hover:opacity-100"
                  aria-label="Mark task done"
                  title="Mark done"
                >
                  <Check className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
