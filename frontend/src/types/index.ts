export type TxType = 'income' | 'expense'
export type RecurringType = 'single' | 'fixed' | 'installments'

export interface User {
  id: string
  username: string
  email: string
  created_at: string
  monthly_budget: number | null
}

export interface Category {
  id: string
  name: string
  type: TxType
  color: string
  icon: string
  is_savings: boolean
}

export interface Transaction {
  id: string
  type: TxType
  amount: number
  category_id: string | null
  description: string
  date: string
  recurring: boolean
  recurring_period: string
  group_id: string | null
  installments_total: number | null
  installments_current: number | null
}

export interface CategoryStat {
  category_id: string | null
  name: string
  icon: string
  color: string
  total: number
  percentage: number
}

export interface DashboardStats {
  balance: number
  income: number
  expense: number
  income_total: number
  expense_total: number
  saved: number
  saved_total: number
  spendable: number
  budget: number | null
  budget_usage: number | null
  month: string
  comparison: { income_delta: number; expense_delta: number }
  expenses_by_category: CategoryStat[]
  income_by_category: CategoryStat[]
  savings_by_category: CategoryStat[]
}

export interface SeriesPoint {
  month: string
  income: number
  expense: number
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}