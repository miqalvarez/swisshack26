// DTOs returned by the backend API (snake_case, mirrors the UML entities).

export type MandateType = 'defensive' | 'balanced' | 'growth'
export type RiskProfile = 'conservative' | 'balanced' | 'aggressive'
export type DriftStatus = 'on-target' | 'minor-drift' | 'breach'
export type CommentChannel = 'call' | 'email' | 'meeting' | 'whatsapp' | 'other'
export type AssetType =
  | 'property'
  | 'cash'
  | 'stock'
  | 'crypto'
  | 'bond'
  | 'fund'
  | 'other'
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'buy'
  | 'sell'
  | 'rebalance'
  | 'transfer'
  | 'suggestion_execution'
export type CommunicationStyle =
  | 'formal-data'
  | 'warm-personal'
  | 'values-narrative'
  | 'executive-brief'
export type SuggestionStatus =
  | 'draft'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'executed'
  | 'expired'

export interface WM {
  id: string
  full_name: string
  email: string
  phone: string | null
}

export interface CustomerSummary {
  id: string
  full_name: string
  persona: string | null
  mandate: MandateType
  risk_profile: RiskProfile
  accent_color: string | null
  base_currency: string
  total_value: number
  pending_suggestions: number
  drift_status: DriftStatus
  communication_style: CommunicationStyle | null
  profile_description: string | null
}

export interface Holding {
  id: string
  customer_id: string
  name: string
  description: string | null
  amount: number
  asset_type: AssetType
  currency: string
  isin: string | null
  sector: string | null
  sub_asset_class: string | null
  region: string | null
  target_amount: number | null
  ticker: string | null
}

export interface Transaction {
  id: string
  customer_id: string
  source_holding_id: string | null
  target_holding_id: string | null
  transaction_type: TransactionType
  gross_amount: number
  currency: string
  executed_at: string
  notes: string | null
}

export interface Comment {
  id: string
  customer_id: string
  author_wm_id: string | null
  comment_date: string
  channel: CommentChannel
  content: string
  is_private: number
}

export interface Suggestion {
  id: string
  customer_id: string
  transaction_id: string | null
  old_holding_id: string | null
  old_holding_name: string | null
  news_title: string
  news_description: string
  news_link: string
  news_date: string
  potential_impact_description: string
  exposure: number
  recommendation_action: string
  recommendation_description: string
  why_title: string | null
  why_description: string | null
  new_holding_name: string
  new_holding_description: string | null
  new_holding_amount: number
  new_holding_type: AssetType
  client_message: string | null
  status: SuggestionStatus
  created_at: string
}

export interface NewsItem {
  id: string
  customer_id: string
  customer_name: string
  accent_color: string | null
  title: string
  description: string
  source_url: string
  published_at: string
  sentiment_score: number | null
  relevance_score: number | null
  related_holding_name: string | null
}

export interface DriftInfo {
  status: DriftStatus
  maxDriftPp: number
  byClass: {
    sub_asset_class: string
    current: number
    target: number
    driftPp: number
  }[]
}

export interface DashboardData {
  wm: WM
  stats: {
    clients: number
    pending_suggestions: number
    assets_under_advice: number
  }
  customers: CustomerSummary[]
  news: NewsItem[]
  suggestions: (Suggestion & {
    customer_name: string
    accent_color: string | null
  })[]
}

export interface CustomerDetail {
  customer: CustomerSummary & {
    mandate: MandateType
    mandate_description: string | null
    investment_universe: string | null
    rebalancing_policy: string | null
    risk_limits: string | null
    primary_contact: string | null
    email: string | null
  }
  drift: DriftInfo
  total_value: number
  pending_suggestions: number
  holdings: Holding[]
  transactions: Transaction[]
  suggestions: Suggestion[]
  comments: Comment[]
}
