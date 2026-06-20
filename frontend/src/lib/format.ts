import type {
  AssetType,
  CommentChannel,
  CommunicationStyle,
  DriftStatus,
  MandateType,
  RiskProfile,
  SuggestionStatus,
  TransactionType,
} from './api-types'

export function formatChf(value: number, opts?: { compact?: boolean }): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    notation: opts?.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts?.compact ? 1 : 0,
  }).format(value)
}

export function formatPct(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export const mandateLabel: Record<MandateType, string> = {
  defensive: 'Defensive',
  balanced: 'Balanced',
  growth: 'Growth',
}

export const riskLabel: Record<RiskProfile, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  aggressive: 'Aggressive',
}

export const driftLabel: Record<
  DriftStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  'on-target': { label: 'On target', variant: 'success' },
  'minor-drift': { label: 'Minor drift', variant: 'warning' },
  breach: { label: 'Drift breach', variant: 'destructive' },
}

export const channelLabel: Record<CommentChannel, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  whatsapp: 'WhatsApp',
  other: 'Other',
}

export const assetTypeLabel: Record<AssetType, string> = {
  property: 'Property',
  cash: 'Cash',
  stock: 'Equity',
  crypto: 'Crypto',
  bond: 'Bond',
  fund: 'Fund',
  other: 'Other',
}

export const txTypeLabel: Record<TransactionType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  buy: 'Buy',
  sell: 'Sell',
  rebalance: 'Rebalance',
  transfer: 'Transfer',
  suggestion_execution: 'Suggestion executed',
}

export const communicationStyleLabel: Record<CommunicationStyle, string> = {
  'formal-data': 'Formal & data-driven',
  'warm-personal': 'Warm & personal',
  'values-narrative': 'Values & narrative',
  'executive-brief': 'Executive brief',
}

/** How technical the client wants advice to be (1 plain ↔ 5 deep detail). */
export function technicalLevelLabel(level: number | null): string {
  if (level == null) return 'Unknown'
  if (level <= 1) return 'Keep it human'
  if (level === 2) return 'Light on detail'
  if (level === 3) return 'Balanced'
  if (level === 4) return 'Quite technical'
  return 'Deep technical detail'
}

export const suggestionStatusLabel: Record<
  SuggestionStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Dropped', variant: 'destructive' },
  executed: { label: 'Executed', variant: 'success' },
  expired: { label: 'Expired', variant: 'secondary' },
}

export function initials(name: string): string {
  const parts = name.replace(/^Familie\s+/i, '').split(/\s+/)
  return parts.slice(0, 1).map((p) => p[0]?.toUpperCase() ?? '').join('')
}
