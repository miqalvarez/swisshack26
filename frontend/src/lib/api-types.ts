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
  recommended_channel: CommentChannel | null
  delivery_approach: string | null
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
    open_tasks: number
  }
  customers: CustomerSummary[]
  news: NewsItem[]
  suggestions: (Suggestion & {
    customer_name: string
    accent_color: string | null
  })[]
  tasks: Task[]
}

export type MilestoneKind =
  | 'deposit'
  | 'withdrawal'
  | 'rebalance'
  | 'advice'
  | 'market'

export interface Milestone {
  date: string
  value: number
  kind: MilestoneKind
  title: string
  amount: number | null
  effect_pct: number
}

export interface WealthSeries {
  history: { date: string; value: number }[]
  forecast: { date: string; expected: number; low: number; high: number }[]
  benchmark: { date: string; value: number }[]
  milestones: Milestone[]
  cagr: number
  benchmarkCagr: number
  projectedValue: number
}

export type TaskStatus = 'open' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  wm_id: string
  customer_id: string | null
  customer_name: string | null
  accent_color: string | null
  suggestion_id: string | null
  title: string
  description: string | null
  channel: CommentChannel | null
  due_date: string
  status: TaskStatus
  priority: TaskPriority
  created_at: string
}

export type SimAction = 'sell' | 'reduce' | 'add' | 'swap'

export interface SimInput {
  action: SimAction
  holding_id?: string
  amount?: number
  new_name?: string
  new_sector?: string
  new_asset_type?: AssetType
}

export interface SimulationResult {
  action: SimAction
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
  drift: { before: number; after: number; status_after: DriftStatus }
  verdict: 'recommended' | 'caution' | 'discouraged'
  summary: string
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
    technical_level: number | null
    preferred_channel: CommentChannel | null
    investment_goal: string | null
    time_horizon_years: number | null
    next_review_date: string | null
  }
  drift: DriftInfo
  total_value: number
  pending_suggestions: number
  wealth: WealthSeries
  last_interaction: string | null
  holdings: Holding[]
  transactions: Transaction[]
  suggestions: Suggestion[]
  comments: Comment[]
  tasks: Task[]
}
