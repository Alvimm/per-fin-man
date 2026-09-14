import { useEffect, useState } from 'react'
import { X, Save, Trash2, TrendingDown, TrendingUp, Repeat, CalendarRange, CalendarClock } from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import type { Category, Transaction, TxType, RecurringType } from '../types'
import { formatDateInput } from '../utils/format'

interface Props {
  open: boolean
  onClose: () => void
  transaction?: Transaction | null
  defaultType?: TxType
  onSaved: () => void
  onDeleted?: () => void
}

export default function TransactionModal({
  open,
  onClose,
  transaction,
  defaultType = 'expense',
  onSaved,
  onDeleted,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<TxType>(defaultType)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(formatDateInput(new Date()))
  const [recurrenceType, setRecurrenceType] = useState<RecurringType>('single')
  const [installmentsTotal, setInstallmentsTotal] = useState(2)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    api
      .get<Category[]>('/categories')
      .then(({ data }) => setCategories(data))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) return
    if (transaction) {
      setType(transaction.type)
      setAmount(String(transaction.amount))
      setCategoryId(transaction.category_id ?? '')
      setDescription(transaction.description)
      setDate(formatDateInput(transaction.date))
      if (transaction.installments_total != null) {
        setRecurrenceType('installments')
        setInstallmentsTotal(transaction.installments_total)
      } else if (transaction.recurring) {
        setRecurrenceType('fixed')
      } else {
        setRecurrenceType('single')
      }
    } else {
      setType(defaultType)
      setAmount('')
      setCategoryId('')
      setDescription('')
      setDate(formatDateInput(new Date()))
      setRecurrenceType('single')
      setInstallmentsTotal(2)
    }
  }, [open, transaction, defaultType])

  if (!open) return null

  const filtered = categories.filter((c) => c.type === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      type,
      amount: parseFloat(amount),
      category_id: categoryId || null,
      description,
      date,
      recurrence_type: recurrenceType,
      installments_total: recurrenceType === 'installments' ? installmentsTotal : 0,
    }
    try {
      if (transaction) {
        await api.put(`/transactions/${transaction.id}`, payload)
      } else {
        await api.post('/transactions', payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!transaction) return
    if (!window.confirm('Excluir esta transação?')) return
    setSaving(true)
    try {
      await api.delete(`/transactions/${transaction.id}`)
      onDeleted?.()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {transaction ? 'Editar transação' : 'Nova transação'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('expense')
                setCategoryId('')
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                type === 'expense'
                  ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income')
                setCategoryId('')
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                type === 'income'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Receita
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <label className="label">Data</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Categoria</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {filtered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_savings ? ' · caixinha' : ''}
                </option>
              ))}
            </select>
          </div>

          {!transaction && (
            <div>
              <label className="label">Recorrência</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRecurrenceType('single')}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                    recurrenceType === 'single'
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400'
                      : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <CalendarRange className="h-4 w-4" />
                  Única
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceType('fixed')}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                    recurrenceType === 'fixed'
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400'
                      : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Repeat className="h-4 w-4" />
                  Fixa mensal
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceType('installments')}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                    recurrenceType === 'installments'
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400'
                      : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <CalendarClock className="h-4 w-4" />
                  Parcelada
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                {recurrenceType === 'fixed' &&
                  'Lançada automaticamente todo mês, sem data de fim (ex.: assinatura de streaming).'}
                {recurrenceType === 'installments' &&
                  'Gera as parcelas mensais automaticamente a partir da data escolhida (ex.: cartão de crédito).'}
                {recurrenceType === 'single' && 'Apenas um lançamento, sem repetição.'}
              </p>
              {recurrenceType === 'installments' && (
                <div className="mt-2">
                  <label className="label">Número de parcelas</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    className="input"
                    value={installmentsTotal}
                    onChange={(e) =>
                      setInstallmentsTotal(Math.max(2, Math.min(60, Number(e.target.value))))
                    }
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Descrição</label>
            <input
              type="text"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Supermercado, Salário..."
              maxLength={200}
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            {transaction && (
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={saving}>
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            )}
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}