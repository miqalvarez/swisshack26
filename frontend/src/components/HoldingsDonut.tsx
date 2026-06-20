import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import { assetTypeLabel, formatChf } from '@/lib/format'
import type { Holding } from '@/lib/api-types'

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
]

type Slice = { key: string; label: string; value: number; color: string }

export function HoldingsDonut({ holdings }: { holdings: Holding[] }) {
  const [active, setActive] = useState<number | null>(null)

  const { slices, total } = useMemo(() => {
    const byType = new Map<string, number>()
    for (const h of holdings) {
      byType.set(h.asset_type, (byType.get(h.asset_type) ?? 0) + h.amount)
    }
    const entries = [...byType.entries()].sort((a, b) => b[1] - a[1])
    const slices: Slice[] = entries.map(([key, value], i) => ({
      key,
      label: assetTypeLabel[key as keyof typeof assetTypeLabel] ?? key,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    const total = slices.reduce((s, x) => s + x.value, 0)
    return { slices, total }
  }, [holdings])

  const focus = active != null ? slices[active] : null

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius={72}
              outerRadius={104}
              paddingAngle={1.5}
              stroke="var(--color-background)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              isAnimationActive={false}
            >
              {slices.map((s, i) => (
                <Cell
                  key={s.key}
                  fill={s.color}
                  opacity={active == null || active === i ? 1 : 0.45}
                  style={{ transition: 'opacity 120ms' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="eyebrow">{focus ? focus.label : 'Total'}</span>
          <span className="tnum text-lg font-semibold">
            {formatChf(focus ? focus.value : total, { compact: true })}
          </span>
          {focus ? (
            <span className="tnum text-xs text-muted-foreground">
              {((focus.value / total) * 100).toFixed(1)}%
            </span>
          ) : (
            <span className="eyebrow">{holdings.length} holdings</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <ul className="w-full flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <li
            key={s.key}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: s.color }}
            />
            <span className="flex-1 text-sm font-medium">{s.label}</span>
            <span className="tnum text-sm text-muted-foreground">
              {((s.value / total) * 100).toFixed(1)}%
            </span>
            <span className="tnum w-24 text-right text-sm font-semibold">
              {formatChf(s.value, { compact: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
