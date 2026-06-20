import { db, nowIso, uuid } from './db.js'
import type { Holding } from './types.js'

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
