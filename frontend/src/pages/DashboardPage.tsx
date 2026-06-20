import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { SuggestionCard } from '@/components/SuggestionCard'
import { NewsCard } from '@/components/NewsCard'
import { EmptyState, ErrorState, Loading } from '@/components/PageState'
import { useDashboard } from '@/lib/queries'
import {
  driftLabel,
  formatChf,
  mandateLabel,
} from '@/lib/format'

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
    { label: 'Pending actions', value: String(data.stats.pending_suggestions) },
    {
      label: 'Assets under advice',
      value: formatChf(data.stats.assets_under_advice, { compact: true }),
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header>
        <div className="eyebrow">Dashboard</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Good day, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What changed for your clients, and what to do about it.
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-5">
            <div className="eyebrow">{s.label}</div>
            <div className="tnum mt-1 text-3xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Action queue */}
        <section className="space-y-3 lg:col-span-3">
          <SectionHeader
            title="Action queue"
            caption="Suggestions inferred from news + CIO signals, matched to each client’s DNA."
          />
          {data.suggestions.length === 0 ? (
            <EmptyState
              title="Inbox zero"
              description="No pending suggestions across your book."
            />
          ) : (
            data.suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                customerId={s.customer_id}
                customerName={s.customer_name}
                accent={s.accent_color}
                linkToClient
              />
            ))
          )}
        </section>

        {/* TLDR news (lives on the dashboard, not the client view) */}
        <section className="space-y-3 lg:col-span-2">
          <SectionHeader
            title="Market signals"
            caption="TLDR news across holdings, monitored 24/7."
          />
          {data.news.length === 0 ? (
            <EmptyState title="No fresh signals" />
          ) : (
            <div className="space-y-3">
              {data.news.map((n) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Clients overview */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <SectionHeader title="Your clients" />
          <Button asChild variant="ghost" size="sm">
            <Link to="/clients">
              All clients <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {data.customers.map((c, i) => {
            const drift = driftLabel[c.drift_status]
            return (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <ClientAvatar name={c.full_name} accent={c.accent_color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.persona}
                  </div>
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

function SectionHeader({
  title,
  caption,
}: {
  title: string
  caption?: string
}) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {caption ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  )
}
