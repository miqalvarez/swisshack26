import { useState } from 'react'
import { FlaskConical, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSimulate } from '@/lib/queries'
import { formatChf, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AssetType, Holding, SimAction, SimulationResult } from '@/lib/api-types'

const ACTIONS: { id: SimAction; label: string }[] = [
  { id: 'swap', label: 'Swap' },
  { id: 'reduce', label: 'Reduce' },
  { id: 'sell', label: 'Sell' },
  { id: 'add', label: 'Add' },
]
const ASSET_TYPES: AssetType[] = ['stock', 'bond', 'fund', 'cash', 'crypto', 'property']

const verdictMeta: Record<
  SimulationResult['verdict'],
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  recommended: { label: 'Recommended', variant: 'success' },
  caution: { label: 'Proceed with caution', variant: 'warning' },
  discouraged: { label: 'Discouraged', variant: 'destructive' },
}

export function SimulationPanel({
  customerId,
  holdings,
}: {
  customerId: string
  holdings: Holding[]
}) {
  const [action, setAction] = useState<SimAction>('swap')
  const [holdingId, setHoldingId] = useState(holdings[0]?.id ?? '')
  const [amount, setAmount] = useState(75000)
  const [newName, setNewName] = useState('')
  const [newSector, setNewSector] = useState('')
  const [newType, setNewType] = useState<AssetType>('stock')
  const sim = useSimulate(customerId)

  const needsHolding = action !== 'add'
  const needsNew = action === 'add' || action === 'swap'
  const needsAmount = action !== 'sell'

  function run() {
    sim.mutate({
      action,
      holding_id: needsHolding ? holdingId : undefined,
      amount: needsAmount ? amount : undefined,
      new_name: needsNew ? newName || 'New position' : undefined,
      new_sector: needsNew ? newSector || undefined : undefined,
      new_asset_type: needsNew ? newType : undefined,
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-5 lg:col-span-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-accent" />
          <h3 className="font-display text-sm font-semibold">What-if simulation</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Model a change before proposing it. Nothing is saved.
        </p>

        <div>
          <div className="eyebrow mb-1.5">Action</div>
          <div className="flex flex-wrap gap-1">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAction(a.id)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  action === a.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {needsHolding ? (
          <label className="block">
            <span className="eyebrow">Holding</span>
            <select
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm outline-none focus:border-accent"
            >
              {holdings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} · {formatChf(h.amount, { compact: true })}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {needsAmount ? (
          <label className="block">
            <span className="eyebrow">Amount (CHF)</span>
            <input
              type="number"
              min={0}
              step={5000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="tnum mt-1.5 w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        ) : null}

        {needsNew ? (
          <div className="space-y-2 rounded-md border border-border bg-background/50 p-3">
            <div className="eyebrow">{action === 'swap' ? 'Replacement' : 'New position'}</div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Instrument name (e.g. Swisscom AG)"
              className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            />
            <input
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              placeholder="Sector / theme (e.g. Swiss Telecom)"
              className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-accent"
            />
            <div className="flex flex-wrap gap-1">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs font-medium capitalize transition-colors',
                    newType === t
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Button onClick={run} disabled={sim.isPending || (needsHolding && !holdingId)} className="w-full">
          {sim.isPending ? 'Simulating…' : 'Run simulation'}
        </Button>
      </div>

      {/* Results */}
      <div className="lg:col-span-3">
        {sim.data ? (
          <Results result={sim.data} />
        ) : (
          <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <TrendingUp className="size-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Configure an action and run the simulation to see its return, DNA
              fit, risk and mandate impact.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Results({ result: r }: { result: SimulationResult }) {
  const v = verdictMeta[r.verdict]
  const dnaColor =
    r.dna.score >= 65 ? 'bg-success' : r.dna.score >= 40 ? 'bg-warning' : 'bg-destructive'

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={v.variant}>{v.label}</Badge>
        {r.cash_raised > 0 ? (
          <span className="eyebrow tnum">
            Cash raised {formatChf(r.cash_raised, { compact: true })}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{r.summary}</p>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Expected return">
          <BeforeAfter
            before={formatPct(r.expected_return.before)}
            after={formatPct(r.expected_return.after)}
            delta={`${r.expected_return.delta_pp >= 0 ? '+' : ''}${r.expected_return.delta_pp}pp`}
            positive={r.expected_return.delta_pp >= 0}
          />
        </Tile>

        <Tile label="Risk (volatility)">
          <BeforeAfter
            before={`${r.risk.vol_before}%`}
            after={`${r.risk.vol_after}%`}
            delta={`${r.risk.vol_delta_pp >= 0 ? '+' : ''}${r.risk.vol_delta_pp}pp`}
            positive={r.risk.vol_delta_pp <= 0}
          />
          <div className="eyebrow mt-1">Concentration {r.risk.concentration_after}%</div>
        </Tile>

        <Tile label="Mandate drift">
          <BeforeAfter
            before={`${r.drift.before}pp`}
            after={`${r.drift.after}pp`}
            delta={r.drift.status_after}
            positive={r.drift.status_after !== 'breach'}
          />
        </Tile>

        <Tile label="DNA alignment">
          <div className="tnum text-lg font-semibold">{r.dna.score}/100</div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', dnaColor)} style={{ width: `${r.dna.score}%` }} />
          </div>
        </Tile>
      </div>

      {r.dna.reasons.length ? (
        <div>
          <div className="eyebrow mb-1.5">Why</div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {r.dna.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">·</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="eyebrow mb-1">{label}</div>
      {children}
    </div>
  )
}

function BeforeAfter({
  before,
  after,
  delta,
  positive,
}: {
  before: string
  after: string
  delta: string
  positive: boolean
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="tnum text-sm text-muted-foreground line-through decoration-muted-foreground/40">
        {before}
      </span>
      <span className="tnum text-lg font-semibold">{after}</span>
      <span className={cn('eyebrow', positive ? 'text-success' : 'text-destructive')}>
        {delta}
      </span>
    </div>
  )
}
