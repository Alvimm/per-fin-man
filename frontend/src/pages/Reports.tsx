import { useEffect, useMemo, useState } from 'react'
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react'
import { BarChart, Bar, Line, LineChart, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import api from '../api/client'
import type { DashboardStats, SeriesPoint } from '../types'
import { formatCurrency, currentMonthKey, monthLabel, shiftMonth, atMinMonth } from '../utils/format'
import CategoryBreakdown from '../components/CategoryBreakdown'

const CHART_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

function toolbarCurrency(value: unknown) {
  return formatCurrency(Number(value))
}

export default function Reports() {
  const [month, setMonth] = useState(currentMonthKey())
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [historyMonths, setHistoryMonths] = useState(6)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const [year, m] = month.split('-').map(Number)
    Promise.all([
      api.get<DashboardStats>('/dashboard/stats', { params: { year, month: m } }),
      api.get<{ series: SeriesPoint[] }>('/dashboard/monthly-series', { params: { months: historyMonths } }),
    ])
      .then(([statsRes, seriesRes]) => {
        if (!active) return
        setStats(statsRes.data)
        setSeries(seriesRes.data.series)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [month, historyMonths])

  const chartData = useMemo(() => {
    return series.map((p) => ({
      ...p,
      label: monthLabel(p.month),
      result: p.income - p.expense,
    }))
  }, [series])

  if (loading && !stats) {
    return <p className="py-20 text-center text-sm text-slate-400">Carregando...</p>
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Relatórios</h1>
          <p className="text-sm text-slate-500">Análise e evolução das suas finanças.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            disabled={atMinMonth(month)}
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <span className="px-2 text-sm font-semibold">{monthLabel(month)}</span>
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Histórico:
          <select
            className="input w-auto"
            value={historyMonths}
            onChange={(e) => setHistoryMonths(Number(e.target.value))}
          >
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </label>
      </div>

      {stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Receitas</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <LineChartIcon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(stats.income)}</p>
              <p className="mt-1 text-xs text-slate-400">Corrigido em {monthLabel(month)}</p>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Despesas</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-500">
                  <BarChart3 className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-500">{formatCurrency(stats.expense)}</p>
              <p className="mt-1 text-xs text-slate-400">Corrigido em {monthLabel(month)}</p>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Resultado</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <PieChartIcon className="h-5 w-5" />
                </span>
              </div>
              <p className={`mt-2 text-2xl font-bold ${stats.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(stats.balance)}
              </p>
              <p className="mt-1 text-xs text-slate-400">Saldo total acumulado</p>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-bold">Evolução mensal</h3>
            {chartData.length > 0 ? (
              <>
                <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(Number(v)).replace(',00', 'k').replace('R$', 'R$')}
                    />
                    <Tooltip formatter={toolbarCurrency} />
                    <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(Number(v)).replace(',00', 'k').replace('R$', 'R$')}
                    />
                    <Tooltip formatter={toolbarCurrency} />
                    <Line type="monotone" dataKey="result" name="Resultado (saldo)" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">Sem dados suficientes para o gráfico.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 text-sm font-bold">Despesas por categoria</h3>
              <CategoryBreakdown data={stats.expenses_by_category} />
            </div>
            <div className="card">
              <h3 className="mb-3 text-sm font-bold">Receitas por categoria</h3>
              <CategoryBreakdown data={stats.income_by_category} />
            </div>
          </div>

          {stats.expenses_by_category.length > 0 && (
            <div className="card">
              <h3 className="mb-3 text-sm font-bold">Participação das despesas</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.expenses_by_category} dataKey="total" nameKey="name" outerRadius={85} labelLine={false}>
                      {stats.expenses_by_category.map((entry, i) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={toolbarCurrency} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}