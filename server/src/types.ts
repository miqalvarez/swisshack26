// Enums mirror the UML class diagram.

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive'
export type CustomerStatus = 'active' | 'inactive' | 'archived'
export type CommentChannel =
  | 'call'
  | 'email'
  | 'meeting'
  | 'whatsapp'
  | 'other'
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
export type SuggestionStatus =
  | 'draft'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'executed'
  | 'expired'
export type CommunicationStyle =
  | 'formal-data'
  | 'warm-personal'
  | 'values-narrative'
  | 'executive-brief'
export type MandateType = 'defensive' | 'balanced' | 'growth'

export interface WM {
  id: string
  full_name: string
  photo_url: string | null
  email: string
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CIOMandate {
  id: string
  name: MandateType
  description: string | null
  investment_universe: string | null
  rebalancing_policy: string | null
  risk_limits: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  wm_id: string
  cio_mandate_id: string
  full_name: string
  photo_url: string | null
  email: string | null
  risk_profile: RiskProfile
  base_currency: string
  status: CustomerStatus
  // Pragmatic extensions for the demo (persona narrative).
  persona: string | null
  primary_contact: string | null
  accent_color: string | null
  communication_style: CommunicationStyle | null
  profile_description: string | null
  technical_level: number | null
  preferred_channel: CommentChannel | null
  investment_goal: string | null
  time_horizon_years: number | null
  next_review_date: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'open' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  wm_id: string
  customer_id: string | null
  suggestion_id: string | null
  title: string
  description: string | null
  channel: CommentChannel | null
  due_date: string
  status: TaskStatus
  priority: TaskPriority
  created_at: string
}

export interface Comment {
  id: string
  customer_id: string
  author_wm_id: string | null
  comment_date: string
  channel: CommentChannel
  content: string
  is_private: number
  created_at: string
}

export interface Holding {
  id: string
  customer_id: string
  name: string
  description: string | null
  amount: number
  asset_type: AssetType
  currency: string
  is_active: number
  // Pragmatic extensions sourced from the SIX portfolio workbook.
  isin: string | null
  sector: string | null
  sub_asset_class: string | null
  region: string | null
  target_amount: number | null
  valor: string | null
  mic: string | null
  ticker: string | null
  created_at: string
  updated_at: string
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
  created_at: string
}

export interface Suggestion {
  id: string
  customer_id: string
  transaction_id: string | null
  old_holding_id: string | null
  news_id: string | null
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
  expires_at: string | null
}

export interface News {
  id: string
  customer_id: string
  title: string
  description: string
  source_url: string
  published_at: string
  sentiment_score: number | null
  relevance_score: number | null
  related_holding_name: string | null
  created_at: string
}
