import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ClientAvatar } from '@/components/ClientAvatar'
import { ErrorState, Loading } from '@/components/PageState'
import { useDashboard } from '@/lib/queries'
import { driftLabel, formatChf, mandateLabel, riskLabel } from '@/lib/format'

export function ClientsPage() {
  const { data, isLoading, isError } = useDashboard()

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState />

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

      <div className="grid gap-4 sm:grid-cols-2">
        {data.customers.map((c) => {
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
                    {c.profile_description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground/70">
                        {c.profile_description}
                      </p>
                    ) : null}
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
    </div>
  )
}
