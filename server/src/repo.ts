import { db, nowIso, uuid } from './db.js'
import type { AssetType, Holding } from './types.js'

/** Per-sub-asset-class drift vs target, in percentage points of total weight. */
export function computeDrift(customerId: string): {
  status: 'on-target' | 'minor-drift' | 'breach'
  maxDriftPp: number
  byClass: { sub_asset_class: string; current: number; target: number; driftPp: number }[]
} {
  const holdings = db
    .prepare(
      `SELECT sub_asset_class, SUM(amount) AS current, SUM(COALESCE(target_amount, amount)) AS target
       FROM holding WHERE customer_id = ? AND is_active = 1
       GROUP BY sub_asset_class`,
    )
    .all(customerId) as { sub_asset_class: string; current: number; target: number }[]

  const totalCur = holdings.reduce((s, h) => s + h.current, 0) || 1
  const totalTgt = holdings.reduce((s, h) => s + h.target, 0) || 1

  let maxDriftPp = 0
  const byClass = holdings.map((h) => {
    const driftPp = (h.current / totalCur - h.target / totalTgt) * 100
    maxDriftPp = Math.max(maxDriftPp, Math.abs(driftPp))
    return {
      sub_asset_class: h.sub_asset_class ?? 'Other',
      current: h.current,
      target: h.target,
      driftPp: Number(driftPp.toFixed(2)),
    }
  })

  const status =
    maxDriftPp > 2 ? 'breach' : maxDriftPp > 0.5 ? 'minor-drift' : 'on-target'
  return { status, maxDriftPp: Number(maxDriftPp.toFixed(2)), byClass }
}

export function customerValue(customerId: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM holding WHERE customer_id = ? AND is_active = 1`,
    )
    .get(customerId) as { v: number }
  return row.v
}

// --- Wealth evolution + forecast -------------------------------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface WealthSeries {
  history: { date: string; value: number }[]
  forecast: { date: string; expected: number; low: number; high: number }[]
  benchmark: { date: string; value: number }[] // same start, market path
  cagr: number // historical, annualised
  benchmarkCagr: number
  projectedValue: number // expected value at the forecast horizon
}

/**
 * Deterministic, semi-synthetic net-worth track for the demo: 36 months of
 * history ending exactly at the client's current value, plus a 12-month forecast
 * with a widening expected/low/high band. Volatility and drift scale with the
 * client's risk profile. Seeded by the customer id so it's stable across calls.
 */
export function wealthSeries(
  customerId: string,
  current: number,
  risk: string,
): WealthSeries {
  const rng = mulberry32(hashString(customerId))
  const driftByRisk: Record<string, number> = {
    conservative: 0.0035,
    balanced: 0.0058,
    aggressive: 0.009,
  }
  const volByRisk: Record<string, number> = {
    conservative: 0.012,
    balanced: 0.024,
    aggressive: 0.04,
  }
  const drift = driftByRisk[risk] ?? 0.005
  const vol = volByRisk[risk] ?? 0.02

  const months = 36
  // Forward growth factors, then scaled so the final point equals `current`.
  const factors: number[] = [1]
  for (let i = 0; i < months; i++) {
    const r = drift + (rng() * 2 - 1) * vol
    factors.push(factors[factors.length - 1] * (1 + r))
  }
  const scale = current / factors[factors.length - 1]

  const startOfMonth = (offset: number) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + offset)
    return d.toISOString().slice(0, 10)
  }

  const history = factors.map((f, i) => ({
    date: startOfMonth(i - months),
    value: Math.round(f * scale),
  }))

  // Benchmark: a shared market path (same seed for every client) starting from
  // the same initial wealth, so out/under-performance is comparable.
  const benchRng = mulberry32(hashString('market-benchmark'))
  const benchDrift = 0.0045
  const benchVol = 0.02
  const startValue = history[0].value
  const benchFactors: number[] = [1]
  for (let i = 0; i < months; i++) {
    const r = benchDrift + (benchRng() * 2 - 1) * benchVol
    benchFactors.push(benchFactors[benchFactors.length - 1] * (1 + r))
  }
  const benchmark = benchFactors.map((f, i) => ({
    date: startOfMonth(i - months),
    value: Math.round(f * startValue),
  }))
  const benchmarkCagr = (Math.pow(1 + benchDrift, 12) - 1) * 100

  // 12-month forecast from `current`, band widening with horizon.
  const fMonths = 12
  const forecast: WealthSeries['forecast'] = []
  let expected = current
  for (let i = 1; i <= fMonths; i++) {
    expected = expected * (1 + drift)
    const spread = vol * Math.sqrt(i) * 1.1
    forecast.push({
      date: startOfMonth(i),
      expected: Math.round(expected),
      low: Math.round(expected * (1 - spread)),
      high: Math.round(expected * (1 + spread)),
    })
  }

  const cagr = (Math.pow(1 + drift, 12) - 1) * 100
  return {
    history,
    forecast,
    benchmark,
    cagr: Number(cagr.toFixed(1)),
    benchmarkCagr: Number(benchmarkCagr.toFixed(1)),
    projectedValue: forecast[forecast.length - 1].expected,
  }
}

export function pendingSuggestionCount(customerId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM suggestion WHERE customer_id = ? AND status = 'pending'`,
    )
    .get(customerId) as { n: number }
  return row.n
}

export function customerSummaries() {
  const customers = db
    .prepare(
      `SELECT c.*, m.name AS mandate
       FROM customer c JOIN cio_mandate m ON m.id = c.cio_mandate_id
       ORDER BY c.full_name`,
    )
    .all() as Array<Record<string, unknown> & { id: string }>

  return customers.map((c) => {
    const drift = computeDrift(c.id)
    return {
      id: c.id,
      full_name: c.full_name,
      persona: c.persona,
      mandate: c.mandate,
      risk_profile: c.risk_profile,
      accent_color: c.accent_color,
      base_currency: c.base_currency,
      total_value: customerValue(c.id),
      pending_suggestions: pendingSuggestionCount(c.id),
      drift_status: drift.status,
      communication_style: c.communication_style,
      profile_description: c.profile_description,
    }
  })
}

/** Apply a suggestion: close the old holding, open the new one, record a
 * suggestion_execution transaction, and mark the suggestion executed. */
export const applySuggestion = db.transaction((suggestionId: string) => {
  const s = db
    .prepare(`SELECT * FROM suggestion WHERE id = ?`)
    .get(suggestionId) as Record<string, any> | undefined
  if (!s) throw new Error('not_found')
  if (s.status !== 'pending' && s.status !== 'accepted')
    throw new Error(`cannot_apply_status_${s.status}`)

  const now = nowIso()
  let oldHolding: Holding | undefined
  if (s.old_holding_id) {
    oldHolding = db
      .prepare(`SELECT * FROM holding WHERE id = ?`)
      .get(s.old_holding_id) as Holding | undefined
  }

  // Create the replacement holding, inheriting sleeve metadata where sensible.
  const newHoldingId = uuid()
  db.prepare(
    `INSERT INTO holding (id, customer_id, name, description, amount, asset_type, currency, is_active, isin, sector, sub_asset_class, region, target_amount, valor, mic, ticker, created_at, updated_at)
     VALUES (@id, @customer_id, @name, @description, @amount, @asset_type, 'CHF', 1, NULL, @sector, @sub_asset_class, @region, @target_amount, NULL, NULL, NULL, @now, @now)`,
  ).run({
    id: newHoldingId,
    customer_id: s.customer_id,
    name: s.new_holding_name,
    description: s.new_holding_description,
    amount: s.new_holding_amount,
    asset_type: s.new_holding_type,
    sector: oldHolding?.sector ?? null,
    sub_asset_class: oldHolding?.sub_asset_class ?? null,
    region: oldHolding?.region ?? null,
    target_amount: oldHolding?.target_amount ?? s.new_holding_amount,
    now,
  })

  // Close the replaced holding.
  if (oldHolding) {
    db.prepare(
      `UPDATE holding SET is_active = 0, updated_at = @now WHERE id = @id`,
    ).run({ id: oldHolding.id, now })
  }

  // Record the execution transaction.
  const txId = uuid()
  db.prepare(
    `INSERT INTO "transaction" (id, customer_id, source_holding_id, target_holding_id, transaction_type, gross_amount, currency, executed_at, notes, created_at)
     VALUES (@id, @customer_id, @source, @target, 'suggestion_execution', @amount, 'CHF', @now, @notes, @now)`,
  ).run({
    id: txId,
    customer_id: s.customer_id,
    source: oldHolding?.id ?? null,
    target: newHoldingId,
    amount: s.new_holding_amount,
    notes: `Applied suggestion: ${s.recommendation_action}`,
    now,
  })

  db.prepare(
    `UPDATE suggestion SET status = 'executed', transaction_id = @tx WHERE id = @id`,
  ).run({ tx: txId, id: suggestionId })

  return { transactionId: txId, newHoldingId }
})

export function dropSuggestion(suggestionId: string) {
  const info = db
    .prepare(
      `UPDATE suggestion SET status = 'rejected' WHERE id = ? AND status = 'pending'`,
    )
    .run(suggestionId)
  if (info.changes === 0) throw new Error('not_found_or_not_pending')
}

// --- Tasks / follow-ups -----------------------------------------------------

/** Open tasks (optionally for one customer) joined with the client name. */
export function listTasks(opts: { customerId?: string; status?: string } = {}) {
  const where: string[] = []
  const params: Record<string, string> = {}
  if (opts.customerId) {
    where.push('t.customer_id = @customerId')
    params.customerId = opts.customerId
  }
  if (opts.status) {
    where.push('t.status = @status')
    params.status = opts.status
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return db
    .prepare(
      `SELECT t.*, c.full_name AS customer_name, c.accent_color
       FROM task t LEFT JOIN customer c ON c.id = t.customer_id
       ${clause}
       ORDER BY (t.status = 'open') DESC, t.due_date ASC`,
    )
    .all(params)
}

export function createTask(input: {
  customer_id?: string | null
  suggestion_id?: string | null
  title: string
  description?: string | null
  channel?: string | null
  due_date: string
  priority?: string
}) {
  const id = uuid()
  const wm = db.prepare(`SELECT id FROM wm LIMIT 1`).get() as { id: string }
  db.prepare(
    `INSERT INTO task (id, wm_id, customer_id, suggestion_id, title, description, channel, due_date, status, priority, created_at)
     VALUES (@id, @wm_id, @customer_id, @suggestion_id, @title, @description, @channel, @due_date, 'open', @priority, @now)`,
  ).run({
    id,
    wm_id: wm.id,
    customer_id: input.customer_id ?? null,
    suggestion_id: input.suggestion_id ?? null,
    title: input.title,
    description: input.description ?? null,
    channel: input.channel ?? null,
    due_date: input.due_date,
    priority: input.priority ?? 'medium',
    now: nowIso(),
  })
  return db.prepare(`SELECT * FROM task WHERE id = ?`).get(id)
}

export function setTaskStatus(taskId: string, status: 'open' | 'done') {
  const info = db
    .prepare(`UPDATE task SET status = ? WHERE id = ?`)
    .run(status, taskId)
  if (info.changes === 0) throw new Error('not_found')
}

/** Most recent relationship-log date for a client (the "last interaction"). */
export function lastInteraction(customerId: string): string | null {
  const row = db
    .prepare(
      `SELECT MAX(comment_date) AS d FROM comment WHERE customer_id = ?`,
    )
    .get(customerId) as { d: string | null }
  return row.d ?? null
}

// --- What-if simulation -----------------------------------------------------

const EXPECTED_RETURN: Record<AssetType, number> = {
  stock: 0.065,
  bond: 0.025,
  fund: 0.05,
  cash: 0.005,
  crypto: 0.12,
  property: 0.04,
  other: 0.03,
}
const VOLATILITY: Record<AssetType, number> = {
  stock: 0.16,
  bond: 0.05,
  fund: 0.12,
  cash: 0.004,
  crypto: 0.6,
  property: 0.1,
  other: 0.1,
}

/** Per-persona DNA affinities/aversions used to score alignment. */
const DNA_PROFILE: Record<
  string,
  { affinities: string[]; aversions: string[] }
> = {
  raeber: {
    affinities: ['swiss', 'schweiz', 'dividend', 'health care', 'telecommunication', 'staples'],
    aversions: ['us tech', 'technology', 'ai', 'nasdaq', 'usa', 'speculat'],
  },
  schneider: {
    affinities: ['health care', 'research', 'swiss', 'schweiz', 'pharma'],
    aversions: ['tobacco', 'weapons'],
  },
  huber: {
    affinities: ['sustainab', 'reforest', 'renewable', 'staples', 'consumer'],
    aversions: ['deforest', 'palm oil', 'fossil', 'oil', 'coal', 'mining'],
  },
  ammann: {
    affinities: ['swiss', 'schweiz', 'premium', 'governance', 'quality'],
    aversions: ['labour', 'scandal', 'controvers', 'exploitation', 'reputation'],
  },
}

interface SimHolding {
  name: string
  amount: number
  asset_type: AssetType
  sub_asset_class: string | null
  target_amount: number | null
  sector?: string | null
  region?: string | null
}

export interface SimInput {
  action: 'sell' | 'reduce' | 'add' | 'swap'
  holding_id?: string
  amount: number
  new_name?: string
  new_sector?: string
  new_asset_type?: AssetType
}

function expectedReturn(hs: SimHolding[]): number {
  const total = hs.reduce((s, h) => s + h.amount, 0) || 1
  return hs.reduce((s, h) => s + h.amount * EXPECTED_RETURN[h.asset_type], 0) / total
}
function volatility(hs: SimHolding[]): number {
  const total = hs.reduce((s, h) => s + h.amount, 0) || 1
  return hs.reduce((s, h) => s + h.amount * VOLATILITY[h.asset_type], 0) / total
}
function concentration(hs: SimHolding[]): number {
  const total = hs.reduce((s, h) => s + h.amount, 0) || 1
  return Math.max(0, ...hs.map((h) => h.amount / total)) * 100
}
function driftOf(hs: SimHolding[]): { maxDriftPp: number; status: string } {
  const groups = new Map<string, { cur: number; tgt: number }>()
  for (const h of hs) {
    const k = h.sub_asset_class ?? 'Other'
    const g = groups.get(k) ?? { cur: 0, tgt: 0 }
    g.cur += h.amount
    g.tgt += h.target_amount ?? h.amount
    groups.set(k, g)
  }
  const totCur = [...groups.values()].reduce((s, g) => s + g.cur, 0) || 1
  const totTgt = [...groups.values()].reduce((s, g) => s + g.tgt, 0) || 1
  let max = 0
  for (const g of groups.values()) {
    max = Math.max(max, Math.abs((g.cur / totCur - g.tgt / totTgt) * 100))
  }
  const status = max > 2 ? 'breach' : max > 0.5 ? 'minor-drift' : 'on-target'
  return { maxDriftPp: Number(max.toFixed(2)), status }
}

/** Affinity of a client toward an instrument's text, in [-1, 1]. */
function affinity(customerId: string, text: string): { score: number; reasons: string[] } {
  const p = DNA_PROFILE[customerId]
  if (!p) return { score: 0, reasons: [] }
  const t = text.toLowerCase()
  const reasons: string[] = []
  let score = 0
  for (const a of p.affinities) if (t.includes(a)) { score += 0.5; reasons.push(`aligns with “${a}”`) }
  for (const a of p.aversions) if (t.includes(a)) { score -= 0.7; reasons.push(`conflicts with “${a}”`) }
  return { score: Math.max(-1, Math.min(1, score)), reasons }
}

export interface SimulationResult {
  action: SimInput['action']
  amount: number
  cash_raised: number
  expected_return: { before: number; after: number; delta_pp: number }
  dna: { score: number; reasons: string[] }
  risk: {
    vol_before: number
    vol_after: number
    vol_delta_pp: number
    concentration_before: number
    concentration_after: number
    label: 'lower' | 'similar' | 'higher'
  }
  drift: { before: number; after: number; status_after: string }
  verdict: 'recommended' | 'caution' | 'discouraged'
  summary: string
}

export function simulateAction(customerId: string, input: SimInput): SimulationResult {
  const rows = db
    .prepare(
      `SELECT name, amount, asset_type, sub_asset_class, target_amount, sector, region
       FROM holding WHERE customer_id = ? AND is_active = 1`,
    )
    .all(customerId) as SimHolding[]

  const before: SimHolding[] = rows.map((h) => ({ ...h }))
  const after: SimHolding[] = rows.map((h) => ({ ...h }))
  const source = input.holding_id
    ? (db
        .prepare(`SELECT name, amount, asset_type, sub_asset_class, target_amount, sector, region FROM holding WHERE id = ? AND customer_id = ?`)
        .get(input.holding_id, customerId) as SimHolding | undefined)
    : undefined

  const idxOf = (name: string) => after.findIndex((h) => h.name === name && h.amount > 0)
  let cashRaised = 0
  const reasons: string[] = []
  let dnaScore = 0

  const newType = input.new_asset_type ?? 'stock'
  const newText = `${input.new_name ?? ''} ${input.new_sector ?? ''}`.trim()

  if (input.action === 'sell' || input.action === 'reduce') {
    if (!source) throw new Error('holding_required')
    const i = idxOf(source.name)
    const amt = input.action === 'sell' ? source.amount : Math.min(input.amount, source.amount)
    if (i >= 0) {
      after[i] = { ...after[i], amount: after[i].amount - amt }
      if (after[i].amount <= 1) after.splice(i, 1)
    }
    cashRaised = amt
    // Selling something the client is averse to is good alignment; selling an
    // affinity is poor.
    const aff = affinity(customerId, `${source.name} ${source.sector ?? ''} ${source.region ?? ''}`)
    dnaScore = -aff.score // invert: removing an aversion (-) -> positive
    reasons.push(...aff.reasons.map((r) => `Holding ${r}`))
  } else if (input.action === 'add') {
    const amt = input.amount
    const cashIdx = after.findIndex((h) => h.asset_type === 'cash')
    if (cashIdx >= 0) {
      after[cashIdx] = { ...after[cashIdx], amount: Math.max(0, after[cashIdx].amount - amt) }
    }
    after.push({
      name: input.new_name ?? 'New position',
      amount: amt,
      asset_type: newType,
      sub_asset_class: input.new_sector ?? 'New sleeve',
      target_amount: amt,
    })
    const aff = affinity(customerId, newText)
    dnaScore = aff.score
    reasons.push(...aff.reasons.map((r) => `New position ${r}`))
  } else {
    // swap: move `amount` from source into a same-sleeve replacement
    if (!source) throw new Error('holding_required')
    const i = idxOf(source.name)
    const amt = Math.min(input.amount, source.amount)
    if (i >= 0) {
      after[i] = { ...after[i], amount: after[i].amount - amt }
      if (after[i].amount <= 1) after.splice(i, 1)
    }
    after.push({
      name: input.new_name ?? 'Replacement',
      amount: amt,
      asset_type: newType,
      sub_asset_class: source.sub_asset_class, // stay in sleeve -> mandate kept
      target_amount: amt,
    })
    const remove = affinity(customerId, `${source.name} ${source.sector ?? ''} ${source.region ?? ''}`)
    const acquire = affinity(customerId, newText)
    // The replacement drives alignment; removing a conflicting holding is a bonus.
    dnaScore = acquire.score
    if (remove.score < 0) dnaScore = Math.min(1, dnaScore + -remove.score * 0.5)
    reasons.push(...acquire.reasons.map((r) => `Replacement ${r}`))
    if (remove.score < 0)
      reasons.push(...remove.reasons.map((r) => `Exiting a holding that ${r}`))
  }

  const erB = expectedReturn(before)
  const erA = expectedReturn(after)
  const volB = volatility(before)
  const volA = volatility(after)
  const concB = concentration(before)
  const concA = concentration(after)
  const driftB = driftOf(before)
  const driftA = driftOf(after)

  const dna100 = Math.round(((dnaScore + 1) / 2) * 100)
  const volDeltaPp = (volA - volB) * 100
  const riskLabel: 'lower' | 'similar' | 'higher' =
    volDeltaPp < -0.3 ? 'lower' : volDeltaPp > 0.3 ? 'higher' : 'similar'

  const driftWorse = driftA.status === 'breach' && driftA.maxDriftPp > driftB.maxDriftPp + 0.1
  let verdict: SimulationResult['verdict']
  if (dna100 >= 65 && !driftWorse && volDeltaPp <= 3) verdict = 'recommended'
  else if (dna100 < 40 || driftWorse || volDeltaPp > 8) verdict = 'discouraged'
  else verdict = 'caution'

  const summary =
    verdict === 'recommended'
      ? 'Fits the client’s DNA and respects the mandate.'
      : verdict === 'discouraged'
        ? 'Conflicts with the client’s DNA, mandate drift, or risk budget.'
        : 'Workable, but review the trade-offs below before proposing it.'

  if (reasons.length === 0) reasons.push('Neutral on the client’s stated preferences.')

  return {
    action: input.action,
    amount: input.action === 'sell' ? (source?.amount ?? 0) : input.amount,
    cash_raised: Math.round(cashRaised),
    expected_return: {
      before: Number((erB * 100).toFixed(2)),
      after: Number((erA * 100).toFixed(2)),
      delta_pp: Number(((erA - erB) * 100).toFixed(2)),
    },
    dna: { score: dna100, reasons: reasons.slice(0, 4) },
    risk: {
      vol_before: Number((volB * 100).toFixed(1)),
      vol_after: Number((volA * 100).toFixed(1)),
      vol_delta_pp: Number(volDeltaPp.toFixed(1)),
      concentration_before: Number(concB.toFixed(1)),
      concentration_after: Number(concA.toFixed(1)),
      label: riskLabel,
    },
    drift: { before: driftB.maxDriftPp, after: driftA.maxDriftPp, status_after: driftA.status },
    verdict,
    summary,
  }
}
