import { Link } from 'react-router-dom'
import { ArrowRight, Check, ExternalLink, Newspaper, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { useApplySuggestion, useDropSuggestion } from '@/lib/queries'
import { formatChf, suggestionStatusLabel } from '@/lib/format'
import type { Suggestion } from '@/lib/api-types'

interface Props {
  suggestion: Suggestion
  customerId: string
  customerName?: string
  accent?: string | null
  linkToClient?: boolean
}

export function SuggestionCard({
  suggestion: s,
  customerId,
  customerName,
  accent,
  linkToClient,
}: Props) {
  const apply = useApplySuggestion(customerId)
  const drop = useDropSuggestion(customerId)
  const busy = apply.isPending || drop.isPending
  const pending = s.status === 'pending'
  const status = suggestionStatusLabel[s.status]

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      {/* News context strip */}
      <div className="flex items-start gap-2.5 border-b border-border bg-muted/40 px-4 py-2.5">
        <Newspaper className="mt-0.5 size-3.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <a
            href={s.news_link}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-accent"
          >
            <span className="truncate">{s.news_title}</span>
            <ExternalLink className="size-3 shrink-0 opacity-50 group-hover:opacity-100" />
          </a>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="p-4">
        {customerName ? (
          <div className="mb-3 flex items-center gap-2">
            <ClientAvatar name={customerName} accent={accent} size="sm" />
            <span className="text-sm font-medium">{customerName}</span>
            <span className="eyebrow ml-auto tnum">
              {s.exposure.toFixed(1)}% exposure
            </span>
          </div>
        ) : (
          <div className="mb-3 flex justify-end">
            <span className="eyebrow tnum">{s.exposure.toFixed(1)}% exposure</span>
          </div>
        )}

        {/* The swap */}
        <div className="flex items-center gap-3 rounded-md border border-border bg-background/60 p-3">
          <div className="min-w-0 flex-1">
            <div className="eyebrow">Replace</div>
            <div className="truncate text-sm font-medium">
              {s.old_holding_name ?? 'Current sleeve'}
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="eyebrow">With</div>
            <div className="truncate text-sm font-medium">{s.new_holding_name}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="eyebrow">Amount</div>
            <div className="tnum text-sm font-semibold">
              {formatChf(s.new_holding_amount, { compact: true })}
            </div>
          </div>
        </div>

        {/* Reasoning — trust & explainability */}
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="eyebrow">Recommendation</dt>
            <dd className="font-medium">{s.recommendation_action}</dd>
            <dd className="text-muted-foreground">{s.recommendation_description}</dd>
          </div>
          {s.why_title ? (
            <div>
              <dt className="eyebrow">Why this fits</dt>
              <dd className="font-medium">{s.why_title}</dd>
              {s.why_description ? (
                <dd className="text-muted-foreground">{s.why_description}</dd>
              ) : null}
            </div>
          ) : null}
          <div>
            <dt className="eyebrow">Potential impact</dt>
            <dd className="text-muted-foreground">
              {s.potential_impact_description}
            </dd>
          </div>
        </dl>

        {(apply.isError || drop.isError) && (
          <p className="mt-3 text-sm text-destructive">
            Could not complete the action. Try again.
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {pending ? (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => apply.mutate(s.id)}
              >
                <Check /> Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => drop.mutate(s.id)}
              >
                <X /> Drop
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {s.status === 'executed'
                ? 'Applied — recorded as a transaction.'
                : s.status === 'rejected'
                  ? 'Dropped by the WM.'
                  : status.label}
            </span>
          )}
          {linkToClient ? (
            <Button asChild variant="ghost" size="sm" className="ml-auto">
              <Link to={`/clients/${customerId}`}>
                Open client <ArrowRight />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
