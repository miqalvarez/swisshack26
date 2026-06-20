import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { HoldingsDonut } from '@/components/HoldingsDonut'
import { WealthChart } from '@/components/WealthChart'
import { SuggestionCard } from '@/components/SuggestionCard'
import { AddClientData } from '@/components/AddClientData'
import { EmptyState, ErrorState, Loading } from '@/components/PageState'
import { useCustomer } from '@/lib/queries'
import {
  assetTypeLabel,
  channelLabel,
  communicationStyleLabel,
  driftLabel,
  formatChf,
  formatDate,
  mandateLabel,
  riskLabel,
  technicalLevelLabel,
  txTypeLabel,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CustomerDetail } from '@/lib/api-types'

const TABS = [
  { id: 'holdings', label: 'Portfolio' },
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'history', label: 'History' },
  { id: 'relationship', label: 'Relationship · DNA' },
] as const
type TabId = (typeof TABS)[number]['id']

export function ClientDetailPage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError } = useCustomer(id)
  const [tab, setTab] = useState<TabId>('holdings')

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState />

  const { customer } = data
  const drift = driftLabel[data.drift.status]
  const pending = data.suggestions.filter((s) => s.status === 'pending')

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/clients">
          <ArrowLeft /> Clients
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <ClientAvatar name={customer.full_name} accent={customer.accent_color} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {customer.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {customer.persona}
            {customer.primary_contact ? ` · ${customer.primary_contact}` : ''}
          </p>
          {customer.profile_description ? (
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground/80">
              {customer.profile_description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{mandateLabel[customer.mandate]} mandate</Badge>
          <Badge variant="outline">{riskLabel[customer.risk_profile]}</Badge>
          <Badge variant={drift.variant}>{drift.label}</Badge>
          {customer.communication_style ? (
            <Badge variant="outline">{communicationStyleLabel[customer.communication_style]}</Badge>
          ) : null}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-4">
        <Kpi label="Portfolio value" value={formatChf(data.total_value, { compact: true })} />
        <Kpi label="Max sleeve drift" value={`${data.drift.maxDriftPp.toFixed(1)}pp`} />
        <Kpi label="Holdings" value={String(data.holdings.length)} />
        <Kpi label="Pending actions" value={String(data.pending_suggestions)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const count = t.id === 'suggestions' && pending.length ? pending.length : null
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {count ? (
                <span className="tnum flex size-5 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {tab === 'holdings' && <HoldingsTab data={data} />}
      {tab === 'suggestions' && (
        <div className="space-y-4">
          {data.suggestions.length === 0 ? (
            <EmptyState title="No suggestions yet" />
          ) : (
            data.suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} customerId={customer.id} />
            ))
          )}
        </div>
      )}
      {tab === 'history' && <HistoryTab data={data} />}
      {tab === 'relationship' && <RelationshipTab data={data} />}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="tnum mt-0.5 text-xl font-semibold">{value}</div>
    </div>
  )
}

function HoldingsTab({ data }: { data: CustomerDetail }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <WealthChart wealth={data.wealth} />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="eyebrow mb-4">Allocation by asset class</div>
        <HoldingsDonut holdings={data.holdings} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 eyebrow font-normal">Holding</th>
              <th className="px-4 py-2.5 eyebrow font-normal">Sleeve</th>
              <th className="hidden px-4 py-2.5 eyebrow font-normal sm:table-cell">Type</th>
              <th className="px-4 py-2.5 eyebrow font-normal text-right">Current</th>
              <th className="hidden px-4 py-2.5 eyebrow font-normal text-right md:table-cell">
                Target
              </th>
              <th className="px-4 py-2.5 eyebrow font-normal text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {data.holdings.map((h) => {
              const delta =
                h.target_amount != null ? h.amount - h.target_amount : null
              return (
                <tr key={h.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{h.name}</div>
                    {h.region ? (
                      <div className="text-xs text-muted-foreground">{h.region}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {h.sector ?? h.sub_asset_class ?? '—'}
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    <Badge variant="outline">{assetTypeLabel[h.asset_type]}</Badge>
                  </td>
                  <td className="tnum px-4 py-2.5 text-right font-medium">
                    {formatChf(h.amount)}
                  </td>
                  <td className="tnum hidden px-4 py-2.5 text-right text-muted-foreground md:table-cell">
                    {h.target_amount != null ? formatChf(h.target_amount) : '—'}
                  </td>
                  <td
                    className={cn(
                      'tnum px-4 py-2.5 text-right text-xs',
                      delta == null
                        ? 'text-muted-foreground'
                        : delta > 0
                          ? 'text-success'
                          : delta < 0
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                    )}
                  >
                    {delta == null
                      ? '—'
                      : `${delta > 0 ? '+' : ''}${formatChf(delta, { compact: true })}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HistoryTab({ data }: { data: CustomerDetail }) {
  if (data.transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Applying a suggestion records a transaction here."
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-2.5 eyebrow font-normal">Date</th>
            <th className="px-4 py-2.5 eyebrow font-normal">Type</th>
            <th className="px-4 py-2.5 eyebrow font-normal">Notes</th>
            <th className="px-4 py-2.5 eyebrow font-normal text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0">
              <td className="tnum px-4 py-2.5 text-muted-foreground">
                {formatDate(t.executed_at)}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant="secondary">{txTypeLabel[t.transaction_type]}</Badge>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{t.notes ?? '—'}</td>
              <td className="tnum px-4 py-2.5 text-right font-medium">
                {formatChf(t.gross_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RelationshipTab({ data }: { data: CustomerDetail }) {
  const { customer } = data
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <AddClientData customerId={customer.id} />

        <div>
          <div className="eyebrow mb-3">
            Relationship log · {data.comments.length} interactions
          </div>
          <ol className="relative space-y-4 border-l border-border pl-5">
            {data.comments.slice(0, 40).map((c) => (
              <li key={c.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-accent" />
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{channelLabel[c.channel]}</Badge>
                  <span className="eyebrow">{formatDate(c.comment_date)}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed">{c.content}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <aside className="space-y-4 lg:col-span-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="eyebrow mb-3">Communication DNA</div>
          <dl className="space-y-3 text-sm">
            {customer.communication_style ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Style</dt>
                <dd className="font-medium">
                  {communicationStyleLabel[customer.communication_style]}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Technical depth</dt>
              <dd className="flex items-center gap-2">
                <DotMeter level={customer.technical_level} />
                <span className="font-medium">
                  {technicalLevelLabel(customer.technical_level)}
                </span>
              </dd>
            </div>
            {customer.preferred_channel ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Preferred channel</dt>
                <dd className="font-medium">{channelLabel[customer.preferred_channel]}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Suggestions and draft messages are tuned to this profile — see the
            “How to deliver this” note on each suggestion.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="eyebrow mb-3">Investment strategy</div>
          <div className="font-display text-base font-semibold">
            {mandateLabel[customer.mandate]}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer.mandate_description}
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80">
            The bank-wide model strategy (set by the CIO) this client is invested
            under. It defines the allowed allocation, universe and rules below.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <Field label="Investment universe" value={customer.investment_universe} />
            <Field label="Rebalancing policy" value={customer.rebalancing_policy} />
            <Field label="Risk limits" value={customer.risk_limits} />
          </dl>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 text-muted-foreground">{value}</dd>
    </div>
  )
}

function DotMeter({ level }: { level: number | null }) {
  const n = level ?? 0
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn('size-1.5 rounded-full', i <= n ? 'bg-primary' : 'bg-border')}
        />
      ))}
    </span>
  )
}
