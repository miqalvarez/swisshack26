import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { useApplySuggestion, useDropSuggestion } from '@/lib/queries'
import type { Suggestion } from '@/lib/api-types'

interface Props {
  suggestion: Suggestion
  customerId: string
  customerName: string
  accent?: string | null
}

/**
 * Compact, scannable suggestion row for the dashboard triage list. The full
 * reasoning (recommendation, why, impact, draft message) lives in the client
 * view — here the WM just sees who/what and can act in one click.
 */
export function SuggestionRow({ suggestion: s, customerId, customerName, accent }: Props) {
  const apply = useApplySuggestion(customerId)
  const drop = useDropSuggestion(customerId)
  const busy = apply.isPending || drop.isPending

  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <Link
        to={`/clients/${customerId}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <ClientAvatar name={customerName} accent={accent} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">
            {customerName}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {s.news_title}
          </div>
        </div>
      </Link>

      <span className="tnum hidden shrink-0 text-xs text-muted-foreground sm:block">
        {s.exposure.toFixed(1)}%
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => apply.mutate(s.id)}
          aria-label={`Apply suggestion for ${customerName}`}
        >
          <Check /> Apply
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          onClick={() => drop.mutate(s.id)}
          aria-label={`Drop suggestion for ${customerName}`}
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
