import { SuggestionCard } from '@/components/SuggestionCard'
import { EmptyState, ErrorState, Loading } from '@/components/PageState'
import { useDashboard } from '@/lib/queries'

export function AlertsPage() {
  const { data, isLoading, isError } = useDashboard()

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="eyebrow">Action queue</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Decisions waiting on you
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suggestions raised by the agents across your book. You recommend; the
          client decides.
        </p>
      </header>

      {data.suggestions.length === 0 ? (
        <EmptyState
          title="Nothing pending"
          description="Every suggestion has been applied or dropped."
        />
      ) : (
        <div className="space-y-4">
          {data.suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              customerId={s.customer_id}
              customerName={s.customer_name}
              accent={s.accent_color}
              linkToClient
            />
          ))}
        </div>
      )}
    </div>
  )
}
