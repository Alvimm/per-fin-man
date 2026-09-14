import { useEffect, useState } from 'react'
import { Smartphone, ArrowRight } from 'lucide-react'
import api from '../api/client'
import type { Category, Transaction } from '../types'
import { CategoryIcon } from './icons'
import { formatCurrency, formatDate } from '../utils/format'

interface Props {
  month: string
  refreshKey: number
  linkToAll?: boolean
}

export default function RecentTransactions({ month, refreshKey, linkToAll }: Props) {
  const [items, setItems] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const [year, m] = month.split('-').map(Number)
    Promise.all([
      api.get<Transaction[]>('/transactions', { params: { year, month: m, limit: 6 } }),
      api.get<Category[]>('/categories'),
    ])
      .then(([txRes, catRes]) => {
        if (!active) return
        const map: Record<string, Category> = {}
        catRes.data.forEach((c) => {
          map[c.id] = c
        })
        setCategories(map)
        setItems(txRes.data)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [month, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
        <Smartphone className="h-4 w-4 animate-pulse" />
        Carregando...
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Nenhuma transação neste mês.</p>
  }

  return (
    <div>
      <div className="space-y-2">
        {items.map((t) => {
          const cat = t.category_id ? categories[t.category_id] : null
          const isIncome = t.type === 'income'
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
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
                  {t.recurring || (t.installments_total != null && t.installments_current != null)
                    ? t.installments_total != null && t.installments_current != null
                      ? ` · ${t.installments_current}/${t.installments_total}`
                      : ' · recorrente'
                    : ''}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                {isIncome ? '+' : '−'} {formatCurrency(t.amount)}
              </span>
            </div>
          )
        })}
      </div>
      {linkToAll && (
        <span className="mt-3 flex items-center justify-end gap-1 text-sm font-medium text-primary-700">
          Ver todas <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}