import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, Target, PiggyBank, ArrowRight } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { DashboardStats } from '../types'
import { formatCurrency, monthLabel, currentMonthKey, shiftMonth, atMinMonth } from '../utils/format'
import TransactionModal from '../components/TransactionModal'
import CategoryBreakdown from '../components/CategoryBreakdown'
import RecentTransactions from '../components/RecentTransactions'
import SavingsPanel from '../components/SavingsPanel'

function StatCard({
  label,
  value,
  icon,
  valueClass,
  hint,
}: {
  label: string
  value: string
  icon: React.ReactNode
  valueClass?: string
  hint?: React.ReactNode
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${valueClass ?? 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </p>
      {hint && <div className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</div>}
    </div>
  )
}

function Delta({ value, invertPositive }: { value: number; invertPositive?: boolean }) {
  if (value === 0) return <span className="text-slate-400">igual ao mês anterior</span>
  const good = invertPositive ? value < 0 : value > 0
  const arrow = value > 0 ? '▲' : '▼'
  return (
    <span className={good ? 'text-emerald-600' : 'text-red-500'}>
      {arrow} {Math.abs(value).toFixed(1)}% vs mês anterior
    </span>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [month, setMonth] = useState(currentMonthKey())
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    const [year, m] = month.split('-').map(Number)
    api
      .get<DashboardStats>('/dashboard/stats', { params: { year, month: m } })
      .then(({ data }) => {
        if (active) setStats(data)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [month, refreshKey])

  const onSaved = useCallback(() => setRefreshKey((k) => k + 1), [])

  const budget = stats?.budget ?? null
  const usage = budget ? Math.min(stats?.budget_usage ?? 0, 100) : 0
  const budgetClass = usage >= 100 ? 'bg-red-500' : usage >= 75 ? 'bg-amber-500' : 'bg-primary-600'

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold md:text-2xl">Olá, {user?.username} 👋</h1>
          <p className="text-sm text-slate-500">Resumo financeiro do período.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova transação</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            disabled={atMinMonth(month)}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-32 px-2 text-center text-sm font-semibold">{monthLabel(month)}</span>
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Link to="/relatorios" className="flex items-center gap-1 text-sm font-medium text-primary-700">
          Relatórios <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && !stats ? (
        <p className="py-20 text-center text-sm text-slate-400">Carregando...</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Saldo do mês"
              value={formatCurrency(stats.balance)}
              icon={<Wallet className="h-5 w-5" />}
              valueClass={stats.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
            <StatCard
              label="Guardado"
              value={formatCurrency(stats.saved_total)}
              icon={<PiggyBank className="h-5 w-5" />}
              valueClass={stats.saved_total >= 0 ? 'text-amber-600' : 'text-red-500'}
              hint={`${monthLabel(month)}: ${formatCurrency(stats.saved)}`}
            />
            <StatCard
              label={`Receitas · ${monthLabel(month)}`}
              value={formatCurrency(stats.income)}
              icon={<TrendingUp className="h-5 w-5" />}
              valueClass="text-emerald-600"
              hint={<Delta value={stats.comparison.income_delta} />}
            />
            <StatCard
              label={`Despesas · ${monthLabel(month)}`}
              value={formatCurrency(stats.expense)}
              icon={<TrendingDown className="h-5 w-5" />}
              valueClass="text-red-500"
              hint={<Delta value={stats.comparison.expense_delta} invertPositive />}
            />
          </div>

          {budget != null && (
            <div className="card mt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary-700" />
                  Orçamento mensal: {formatCurrency(budget)}
                </span>
                <span className="text-sm font-bold">{stats.budget_usage ?? 0}% utilizado</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full transition-all ${budgetClass}`} style={{ width: `${Math.max(usage, 4)}%` }} />
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="card">
              <h3 className="mb-3 text-sm font-bold">Despesas por categoria</h3>
              <CategoryBreakdown data={stats.expenses_by_category} />
            </div>
            <div className="card">
              <h3 className="mb-3 text-sm font-bold">Receitas por categoria</h3>
              <CategoryBreakdown data={stats.income_by_category} />
            </div>
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <PiggyBank className="h-4 w-4 text-amber-500" />
                Caixinhas
              </h3>
              <SavingsPanel items={stats.savings_by_category} onChanged={onSaved} />
            </div>
          </div>

          <div className="card mt-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Últimas transações</h3>
              <Link to="/transacoes" className="flex items-center gap-1 text-xs font-medium text-primary-700">
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <RecentTransactions month={month} refreshKey={refreshKey} />
          </div>
        </>
      ) : null}

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={onSaved} />
    </div>
  )
}