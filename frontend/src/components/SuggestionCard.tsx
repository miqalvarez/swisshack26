import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ExternalLink,
  Mail,
  MessageCircle,
  MessageSquareQuote,
  Newspaper,
  Phone,
  Users,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { TraceabilitySteps } from '@/components/TraceabilitySteps'
import { CreateTaskButton } from '@/components/CreateTaskButton'
import { useApplySuggestion, useDropSuggestion } from '@/lib/queries'
import { channelLabel, formatChf, suggestionStatusLabel } from '@/lib/format'
import type { CommentChannel, Suggestion } from '@/lib/api-types'

const channelIcon: Record<CommentChannel, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  whatsapp: MessageCircle,
  other: MessageSquareQuote,
}

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
        {/* Traceability: news -> analysis -> advice -> action */}
        <div className="mb-4 rounded-md border border-border bg-muted/20 px-2 py-3">
          <TraceabilitySteps suggestion={s} />
        </div>

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

        {/* How to deliver it — channel + approach tuned to the client's DNA */}
        {s.recommended_channel || s.delivery_approach ? (
          <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="eyebrow">How to deliver this</span>
              {s.recommended_channel ? (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                  {(() => {
                    const Icon = channelIcon[s.recommended_channel]
                    return <Icon className="size-3.5 text-accent" />
                  })()}
                  {channelLabel[s.recommended_channel]}
                </span>
              ) : null}
            </div>
            {s.delivery_approach ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.delivery_approach}
              </p>
            ) : null}
          </div>
        ) : null}

        {s.client_message ? (
          <div className="mt-3 rounded-md border border-accent/20 bg-accent/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquareQuote className="size-3.5 text-accent" />
              <span className="eyebrow text-accent">What to say</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{s.client_message}</p>
          </div>
        ) : null}

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

        {/* Schedule a follow-up off this suggestion */}
        <div className="mt-3 border-t border-border pt-3">
          <CreateTaskButton
            customerId={customerId}
            suggestionId={s.id}
            defaultTitle={`Follow up: ${s.recommendation_action}`}
            defaultChannel={s.recommended_channel}
          />
        </div>
      </div>
    </article>
  )
}
