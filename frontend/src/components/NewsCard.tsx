import { ExternalLink } from 'lucide-react'

import { ClientAvatar } from '@/components/ClientAvatar'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NewsItem } from '@/lib/api-types'

function sentiment(score: number | null): {
  label: string
  className: string
} {
  if (score == null) return { label: 'Neutral', className: 'text-muted-foreground' }
  if (score > 0.15) return { label: 'Positive', className: 'text-success' }
  if (score < -0.15) return { label: 'Negative', className: 'text-destructive' }
  return { label: 'Neutral', className: 'text-muted-foreground' }
}

export function NewsCard({ item }: { item: NewsItem }) {
  const s = sentiment(item.sentiment_score)
  return (
    <a
      href={item.source_url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent/50"
    >
      <div className="flex items-center gap-2">
        <ClientAvatar name={item.customer_name} accent={item.accent_color} size="sm" />
        <span className="text-xs font-medium">{item.customer_name}</span>
        <span className="eyebrow ml-auto">{formatDate(item.published_at)}</span>
      </div>

      <h3 className="mt-3 flex items-start gap-1.5 font-display text-sm font-semibold leading-snug">
        <span className="group-hover:text-accent">{item.title}</span>
        <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
        {item.description}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <span className={cn('eyebrow', s.className)}>{s.label}</span>
        {item.related_holding_name ? (
          <span className="eyebrow">· {item.related_holding_name}</span>
        ) : null}
        {item.relevance_score != null ? (
          <span className="eyebrow tnum ml-auto">
            rel {Math.round(item.relevance_score * 100)}
          </span>
        ) : null}
      </div>
    </a>
  )
}
