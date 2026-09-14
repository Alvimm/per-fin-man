import { useState } from 'react'
import { Minus, X } from 'lucide-react'
import api from '../api/client'
import type { CategoryStat } from '../types'
import { CategoryIcon } from './icons'
import { formatCurrency } from '../utils/format'

interface Props {
  items: CategoryStat[]
  onChanged: () => void
}

export default function SavingsPanel({ items, onChanged }: Props) {
  const [withdrawCat, setWithdrawCat] = useState<CategoryStat | null>(null)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!items || items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Nenhum valor guardado ainda.</p>
  }

  const openWithdraw = (cat: CategoryStat) => {
    setWithdrawCat(cat)
    setAmount('')
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!withdrawCat) return
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/transactions', {
        type: 'income',
        amount: value,
        category_id: withdrawCat.category_id,
        description: 'Retirada da caixinha',
        date: new Date().toISOString().slice(0, 10),
      })
      setWithdrawCat(null)
      onChanged()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Erro ao retirar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.category_id ?? item.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <CategoryIcon name={item.icon} className="h-5 w-5 shrink-0" style={{ color: item.color }} />
              <span className="truncate font-medium">{item.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={`font-bold ${item.total < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                {formatCurrency(item.total)}
              </span>
              <button
                onClick={() => openWithdraw(item)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Minus className="h-3 w-3" />
                Retirar
              </button>
            </span>
          </div>
        ))}
      </div>

      {withdrawCat && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setWithdrawCat(null)}
        >
          <div
            className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Retirar da caixinha</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <CategoryIcon name={withdrawCat.icon} className="h-4 w-4" style={{ color: withdrawCat.color }} />
                  {withdrawCat.name} · saldo {formatCurrency(withdrawCat.total)}
                </p>
              </div>
              <button
                onClick={() => setWithdrawCat(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Valor a retirar (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setWithdrawCat(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Retirando...' : 'Retirar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}