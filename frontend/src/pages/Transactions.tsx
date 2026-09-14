import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Search } from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import type { Category, Transaction, TxType } from '../types'
import { formatCurrency, formatDate, currentMonthKey, shiftMonth, monthLabel, atMinMonth } from '../utils/format'
import { CategoryIcon } from '../components/icons'
import TransactionModal from '../components/TransactionModal'

export default function Transactions() {
  const [items, setItems] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [month, setMonth] = useState(currentMonthKey())
  const [type, setType] = useState<'' | TxType>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchData = () => {
    setLoading(true)
    const [year, m] = month.split('-').map(Number)
    return api
      .get<Transaction[]>('/transactions', { params: { year, month: m, limit: 500 } })
      .then(({ data }) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get<Category[]>('/categories').then(({ data }) => setCategories(data)).catch(() => {})
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const catMap = useMemo(() => {
    const map: Record<string, Category> = {}
    categories.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [categories])

  const filtered = useMemo(
    () =>
      items.filter((t) => {
        if (type && t.type !== type) return false
        if (categoryFilter && t.category_id !== categoryFilter) return false
        if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [items, type, categoryFilter, search]
  )

  const totals = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [filtered])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta transação?')) return
    try {
      await api.delete(`/transactions/${id}`)
      setItems((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold md:text-2xl">Transações</h1>
          <p className="text-sm text-slate-500">Suas receitas e despesas.</p>
        </div>
        <button
          className="btn-primary shrink-0"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova transação</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              disabled={atMinMonth(month)}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-semibold">{monthLabel(month)}</span>
            <button
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as '' | TxType)}>
            <option value="">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <select
            className="input w-auto"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card !p-3.5">
            <p className="text-xs font-medium text-slate-500">Receitas</p>
            <p className="mt-0.5 truncate text-base font-bold text-emerald-600 md:text-lg">
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div className="card !p-3.5">
            <p className="text-xs font-medium text-slate-500">Despesas</p>
            <p className="mt-0.5 truncate text-base font-bold text-red-500 md:text-lg">
              {formatCurrency(totals.expense)}
            </p>
          </div>
          <div className="card !p-3.5">
            <p className="text-xs font-medium text-slate-500">Resultado</p>
            <p
              className={`mt-0.5 truncate text-base font-bold md:text-lg ${
                totals.balance >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {formatCurrency(totals.balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-400">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Nenhuma transação encontrada.</p>
        ) : (
          <>
            {/* Lista mobile */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {filtered.map((t) => {
                const cat = t.category_id ? catMap[t.category_id] : null
                const isIncome = t.type === 'income'
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3.5">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${cat?.color ?? '#94a3b8'}22` }}
                    >
                      <CategoryIcon
                        name={cat?.icon}
                        className="h-5 w-5"
                        style={{ color: cat?.color }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.description}</p>
                      <p className="truncate text-xs text-slate-400">
                        {formatDate(t.date)}
                        {cat ? ` · ${cat.name}` : ''}
                        {recurLabel(t) ? ` · ${recurLabel(t)}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '−'} {formatCurrency(t.amount)}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                        onClick={() => {
                          setEditing(t)
                          setModalOpen(true)
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() => handleDelete(t.id)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tabela desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((t) => {
                    const cat = t.category_id ? catMap[t.category_id] : null
                    const isIncome = t.type === 'income'
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                        <td className="px-4 py-3 font-medium">{t.description}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <span className="h-2 w-2 rounded-full" style={{ background: cat?.color ?? '#94a3b8' }} />
                            <CategoryIcon name={cat?.icon} className="h-3.5 w-3.5" style={{ color: cat?.color ?? '#94a3b8' }} />
                            {cat?.name ?? 'Sem categoria'}
                            {recurLabel(t) && <span className="text-indigo-500">· {recurLabel(t)}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isIncome ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isIncome ? '+' : '−'} {formatCurrency(t.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                            onClick={() => {
                              setEditing(t)
                              setModalOpen(true)
                            }}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() => handleDelete(t.id)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        </div>

      {modalOpen && (
        <TransactionModal
          open={modalOpen}
          transaction={editing}
          onClose={() => setModalOpen(false)}
          onSaved={fetchData}
          onDeleted={fetchData}
        />
      )}
    </div>
  )
}

function recurLabel(t: Transaction): string {
  if (t.installments_total != null && t.installments_current != null) {
    return `${t.installments_current}/${t.installments_total}`
  }
  if (t.recurring) {
    return 'recorrente'
  }
  return ''
}