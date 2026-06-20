import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { SuggestionRow } from '@/components/SuggestionRow'
import { NewsCard } from '@/components/NewsCard'
import { EmptyState, ErrorState, Loading } from '@/components/PageState'
import { useDashboard } from '@/lib/queries'
import { driftLabel, formatChf, mandateLabel } from '@/lib/format'

const driftTextClass: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState />

  const firstName = data.wm.full_name.split(' ')[0]
  const stats = [
    { label: 'Clients', value: String(data.stats.clients) },
    { label: 'Need action', value: String(data.stats.pending_suggestions) },
    {
      label: 'Assets',
      value: formatChf(data.stats.assets_under_advice, { compact: true }),
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Good day, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who needs your attention today.
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <div className="eyebrow">{s.label}</div>
            <div className="tnum mt-1 text-2xl font-semibold sm:text-3xl">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Action queue — compact triage list */}
        <section className="lg:col-span-3">
          <ListHeader
            title="Action queue"
            count={data.suggestions.length}
            to="/alerts"
          />
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {data.suggestions.length === 0 ? (
              <EmptyState title="Inbox zero" />
            ) : (
              <div className="divide-y divide-border">
                {data.suggestions.map((s) => (
                  <SuggestionRow
                    key={s.id}
                    suggestion={s}
                    customerId={s.customer_id}
                    customerName={s.customer_name}
                    accent={s.accent_color}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* TLDR news (lives on the dashboard, not the client view) */}
        <section className="lg:col-span-2">
          <ListHeader title="Market signals" count={data.news.length} />
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {data.news.length === 0 ? (
              <EmptyState title="No fresh signals" />
            ) : (
              <div className="divide-y divide-border">
                {data.news.map((n) => (
                  <NewsCard key={n.id} item={n} compact />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Clients overview */}
      <section>
        <ListHeader title="Your clients" to="/clients" toLabel="All clients" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {data.customers.map((c, i) => {
            const drift = driftLabel[c.drift_status]
            return (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <ClientAvatar name={c.full_name} accent={c.accent_color} />
                <div className="min-w-0 flex-1 truncate text-sm font-medium">
                  {c.full_name}
                </div>
                <span className="eyebrow hidden w-20 sm:block">
                  {mandateLabel[c.mandate]}
                </span>
                <span
                  className={`eyebrow hidden w-24 sm:block ${driftTextClass[drift.variant]}`}
                >
                  {drift.label}
                </span>
                <span className="tnum w-24 text-right text-sm font-semibold">
                  {formatChf(c.total_value, { compact: true })}
                </span>
                {c.pending_suggestions > 0 ? (
                  <span className="tnum flex size-5 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {c.pending_suggestions}
                  </span>
                ) : (
                  <span className="size-5" />
                )}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function ListHeader({
  title,
  count,
  to,
  toLabel = 'View all',
}: {
  title: string
  count?: number
  to?: string
  toLabel?: string
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h2 className="font-display text-base font-semibold tracking-tight">
        {title}
      </h2>
      {count != null ? (
        <span className="tnum text-sm text-muted-foreground">{count}</span>
      ) : null}
      {to ? (
        <Button asChild variant="ghost" size="sm" className="ml-auto h-7">
          <Link to={to}>
            {toLabel} <ArrowRight />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
