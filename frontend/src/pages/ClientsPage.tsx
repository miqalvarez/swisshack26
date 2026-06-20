import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ClientAvatar } from '@/components/ClientAvatar'
import { ErrorState, Loading } from '@/components/PageState'
import { useDashboard } from '@/lib/queries'
import { driftLabel, formatChf, mandateLabel, riskLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CustomerSummary } from '@/lib/api-types'

type Segment = 'all' | 'attention' | 'news' | 'usual'

export function ClientsPage() {
  const { data, isLoading, isError } = useDashboard()
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<Segment>('all')

  const newsClientIds = useMemo(
    () => new Set((data?.news ?? []).map((n) => n.customer_id)),
    [data?.news],
  )

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState />

  const needsAttention = (c: CustomerSummary) =>
    c.pending_suggestions > 0 || c.drift_status === 'breach'

  const segmentOf = (c: CustomerSummary): Exclude<Segment, 'all'> =>
    needsAttention(c) ? 'attention' : newsClientIds.has(c.id) ? 'news' : 'usual'

  const counts = {
    all: data.customers.length,
    attention: data.customers.filter((c) => segmentOf(c) === 'attention').length,
    news: data.customers.filter((c) => segmentOf(c) === 'news').length,
    usual: data.customers.filter((c) => segmentOf(c) === 'usual').length,
  }

  const q = query.trim().toLowerCase()
  const filtered = data.customers.filter((c) => {
    const matchesQuery =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      (c.persona ?? '').toLowerCase().includes(q)
    const matchesSegment = segment === 'all' || segmentOf(c) === segment
    return matchesQuery && matchesSegment
  })

  const segments: { id: Segment; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'attention', label: 'Needs attention' },
    { id: 'news', label: 'News' },
    { id: 'usual', label: 'As usual' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="eyebrow">Clients</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Your book
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.customers.length} relationships under advice.
        </p>
      </header>

      {/* Controls: segments + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {segments.map((s) => (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                segment === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {s.label}
              <span
                className={cn(
                  'tnum text-xs',
                  segment === s.id
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground/70',
                )}
              >
                {counts[s.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No clients match this filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((c) => {
            const drift = driftLabel[c.drift_status]
            return (
              <Link key={c.id} to={`/clients/${c.id}`} className="group">
                <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors group-hover:border-accent/50">
                  <div className="flex items-center gap-4">
                    <ClientAvatar name={c.full_name} accent={c.accent_color} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-display text-base font-semibold">
                          {c.full_name}
                        </h2>
                        {c.pending_suggestions > 0 ? (
                          <span className="tnum flex size-5 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                            {c.pending_suggestions}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.persona}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{mandateLabel[c.mandate]}</Badge>
                      <Badge variant={drift.variant}>{drift.label}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="eyebrow">{riskLabel[c.risk_profile]}</div>
                      <div className="tnum text-sm font-semibold">
                        {formatChf(c.total_value, { compact: true })}
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
