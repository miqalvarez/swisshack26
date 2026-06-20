import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Suggestion } from '@/lib/api-types'

/**
 * Visualises the chain that produced a suggestion — news → analysis → advice →
 * action — so the WM can trace why the AI connected an event to a recommendation.
 * Directly supports the "trust & explainability" goal.
 */
export function TraceabilitySteps({ suggestion: s }: { suggestion: Suggestion }) {
  const actionDone = s.status === 'executed' || s.status === 'rejected'
  const actionLabel =
    s.status === 'executed'
      ? 'Applied'
      : s.status === 'rejected'
        ? 'Dropped'
        : 'Awaiting decision'

  const steps = [
    { key: 'news', label: 'News / event', detail: s.news_title, done: true },
    {
      key: 'analysis',
      label: 'AI analysis',
      detail: s.potential_impact_description,
      done: true,
    },
    {
      key: 'advice',
      label: 'Advice',
      detail: s.recommendation_action,
      done: true,
    },
    { key: 'action', label: 'Action', detail: actionLabel, done: actionDone },
  ]

  return (
    <ol className="flex items-stretch">
      {steps.map((step, i) => {
        const active = !step.done && step.key === 'action'
        return (
          <li key={step.key} className="relative flex-1">
            {/* connector */}
            {i > 0 ? (
              <span
                className={cn(
                  'absolute left-0 top-2.5 h-0.5 w-1/2 -translate-x-1/2',
                  step.done || active ? 'bg-accent/40' : 'bg-border',
                )}
              />
            ) : null}
            <div className="relative flex flex-col items-center px-1 text-center">
              <span
                className={cn(
                  'z-10 flex size-5 items-center justify-center rounded-full ring-4 ring-card',
                  step.done
                    ? 'bg-accent text-accent-foreground'
                    : active
                      ? 'border-2 border-accent bg-card'
                      : 'border-2 border-border bg-card',
                )}
              >
                {step.done ? <Check className="size-3" /> : null}
              </span>
              <span className="eyebrow mt-1.5">{step.label}</span>
              <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {step.detail}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
