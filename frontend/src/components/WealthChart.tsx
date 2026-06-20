import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatChf, formatPct } from '@/lib/format'
import type { Milestone, MilestoneKind, WealthSeries } from '@/lib/api-types'

function monthLabel(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-CH', { month: 'short', year: '2-digit' }).format(d)
}

const KIND_LABEL: Record<MilestoneKind, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  rebalance: 'Rebalance',
  advice: 'Advice applied',
  market: 'Market move',
}

interface Row {
  date: string
  value?: number
  expected?: number
  band?: [number, number]
  benchmark?: number
  mvalue?: number
}

export function WealthChart({ wealth }: { wealth: WealthSeries }) {
  const hist = wealth.history
  const todayDate = hist[hist.length - 1]?.date
  const current = hist[hist.length - 1]?.value ?? 0
  const benchByDate = new Map(wealth.benchmark.map((b) => [b.date, b.value]))
  const mileByDate = new Map(wealth.milestones.map((m) => [m.date, m]))

  const data: Row[] = [
    ...hist.map((h, i) =>
      i === hist.length - 1
        ? { date: h.date, value: h.value, expected: h.value, band: [h.value, h.value] as [number, number], benchmark: benchByDate.get(h.date), mvalue: mileByDate.get(h.date)?.value }
        : { date: h.date, value: h.value, benchmark: benchByDate.get(h.date), mvalue: mileByDate.get(h.date)?.value },
    ),
    ...wealth.forecast.map((f) => ({
      date: f.date,
      expected: f.expected,
      band: [f.low, f.high] as [number, number],
    })),
  ]

  const projUpside = current > 0 ? ((wealth.projectedValue - current) / current) * 100 : 0
  const vsBenchmark = wealth.cagr - wealth.benchmarkCagr

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Net worth</div>
          <div className="tnum text-2xl font-semibold">{formatChf(current)}</div>
        </div>
        <div className="flex gap-6">
          <Metric label="3y growth (CAGR)" value={formatPct(wealth.cagr)} positive={wealth.cagr >= 0} />
          <Metric
            label="vs benchmark"
            value={`${vsBenchmark >= 0 ? '+' : ''}${vsBenchmark.toFixed(1)}pp`}
            positive={vsBenchmark >= 0}
          />
          <Metric
            label="12m projection"
            value={formatChf(wealth.projectedValue, { compact: true })}
            sub={formatPct(projUpside)}
            positive={projUpside >= 0}
          />
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              tickFormatter={monthLabel}
              minTickGap={48}
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              tickFormatter={(v) => `${((v as number) / 1_000_000).toFixed(1)}M`}
              width={44}
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 400000', 'dataMax + 400000']}
            />
            <Tooltip
              content={(props: { active?: boolean; payload?: unknown; label?: unknown }) => (
                <WealthTooltip
                  active={props.active}
                  payload={props.payload as never}
                  label={props.label as string | undefined}
                  milestones={mileByDate}
                />
              )}
            />

            {/* Forecast uncertainty band */}
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--color-primary)"
              fillOpacity={0.08}
              isAnimationActive={false}
            />
            {/* Historical net worth */}
            <Area
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#wealthFill)"
              isAnimationActive={false}
              connectNulls
            />
            {/* Benchmark (market) over the history window */}
            <Line
              dataKey="benchmark"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {/* Expected forecast (dashed) */}
            <Line
              dataKey="expected"
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />

            {todayDate ? (
              <ReferenceLine
                x={todayDate}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="3 3"
                label={{
                  value: 'today',
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: 'var(--color-muted-foreground)',
                }}
              />
            ) : null}

            {/* Milestone markers — hover for detail */}
            <Scatter dataKey="mvalue" shape={<MilestoneDot />} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <Legend swatch="solid">History</Legend>
        <Legend swatch="benchmark">Benchmark</Legend>
        <Legend swatch="dashed">Projection</Legend>
        <Legend swatch="milestone">Milestones</Legend>
        <span className="ml-auto">Illustrative projection · not advice</span>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  sub,
  positive,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <div className="text-right">
      <div className="eyebrow">{label}</div>
      <div className="tnum text-sm font-semibold">
        {value}
        {sub ? (
          <span className={positive ? 'ml-1 text-success' : 'ml-1 text-destructive'}>
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function Legend({
  swatch,
  children,
}: {
  swatch: 'solid' | 'dashed' | 'band' | 'benchmark' | 'milestone'
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch === 'band' ? (
        <span className="h-2 w-4 rounded-sm bg-primary/15" />
      ) : swatch === 'benchmark' ? (
        <span className="h-0.5 w-4 bg-muted-foreground" />
      ) : swatch === 'milestone' ? (
        <span className="size-2.5 rounded-full border-2 border-accent bg-card" />
      ) : (
        <span
          className="h-0.5 w-4 bg-primary"
          style={swatch === 'dashed' ? { backgroundImage: 'none', borderTop: '2px dashed var(--color-primary)', height: 0 } : undefined}
        />
      )}
      {children}
    </span>
  )
}

/** A ringed marker drawn at each milestone point on the line. */
function MilestoneDot(props: { cx?: number; cy?: number; payload?: Row }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || payload?.mvalue == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="var(--color-card)" stroke="var(--color-accent)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={2} fill="var(--color-accent)" />
    </g>
  )
}

function WealthTooltip({
  active,
  payload,
  label,
  milestones,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | [number, number] }>
  label?: string
  milestones: Map<string, Milestone>
}) {
  if (!active || !payload?.length) return null
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value
  const value = get('value') as number | undefined
  const expected = get('expected') as number | undefined
  const band = get('band') as [number, number] | undefined
  const benchmark = get('benchmark') as number | undefined
  const milestone = label ? milestones.get(label) : undefined

  return (
    <div className="max-w-56 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="eyebrow mb-1">{label ? monthLabel(label) : ''}</div>
      {value != null ? (
        <div className="tnum font-medium">{formatChf(value)}</div>
      ) : null}
      {expected != null && value == null ? (
        <div className="tnum font-medium">~{formatChf(expected)}</div>
      ) : null}
      {band && value == null ? (
        <div className="tnum text-muted-foreground">
          {formatChf(band[0], { compact: true })} – {formatChf(band[1], { compact: true })}
        </div>
      ) : null}
      {benchmark != null ? (
        <div className="tnum text-muted-foreground">
          Benchmark {formatChf(benchmark, { compact: true })}
        </div>
      ) : null}
      {milestone ? (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" />
            <span className="eyebrow !text-accent">{KIND_LABEL[milestone.kind]}</span>
          </div>
          <div className="mt-1 font-medium leading-snug text-foreground">
            {milestone.title}
          </div>
          {milestone.amount != null ? (
            <div className={`tnum mt-0.5 ${milestone.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
              {milestone.amount >= 0 ? '+' : ''}
              {formatChf(milestone.amount)}
            </div>
          ) : milestone.effect_pct !== 0 ? (
            <div className={`tnum mt-0.5 ${milestone.effect_pct >= 0 ? 'text-success' : 'text-destructive'}`}>
              {milestone.effect_pct >= 0 ? '+' : ''}
              {milestone.effect_pct}% on wealth
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
