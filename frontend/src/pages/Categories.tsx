import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, TrendingDown, TrendingUp, Save, PiggyBank } from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import type { Category, TxType } from '../types'
import { CategoryIcon, PRESET_ICONS } from '../components/icons'

const PRESET_COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
  '#84cc16', '#06b6d4','#000000','#ffffff','#facc15',
]

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | TxType>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<TxType>('expense')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon, setIcon] = useState(PRESET_ICONS[0])
  const [isSavings, setIsSavings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCategories = () => {
    setLoading(true)
    api.get<Category[]>('/categories').then(({ data }) => setCategories(data)).finally(() => setLoading(false))
  }

  useEffect(fetchCategories, [])

  const openCreate = (initialType: TxType) => {
    setEditing(null)
    setName('')
    setType(initialType)
    setColor(PRESET_COLORS[0])
    setIcon(PRESET_ICONS[0])
    setIsSavings(false)
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setName(cat.name)
    setType(cat.type)
    setColor(cat.color)
    setIcon(cat.icon)
    setIsSavings(cat.is_savings)
    setError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { name, type, color, icon, is_savings: isSavings }
      if (editing) {
        await api.put(`/categories/${editing.id}`, payload)
      } else {
        await api.post('/categories', payload)
      }
      fetchCategories()
      setModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    const ok = window.confirm(
      `Excluir a categoria "${cat.name}"? As transações vinculadas serão mantidas sem categoria.`
    )
    if (!ok) return
    try {
      await api.delete(`/categories/${cat.id}`)
      fetchCategories()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const visible = tab === 'all' ? categories : categories.filter((c) => c.type === tab)

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold md:text-2xl">Categorias</h1>
          <p className="text-sm text-slate-500">Organize receitas e despesas.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {/* <button className="btn-secondary !px-3" onClick={() => openCreate('income')} aria-label="Nova categoria de receita">
            <Plus className="h-4 w-4 text-emerald-600" />
          </button> */}
          <button className="btn-primary" onClick={() => openCreate('expense')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova</span>
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(['all', 'income', 'expense'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            {t === 'all' ? 'Todas' : t === 'income' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-400">Carregando...</p>
      ) : visible.length === 0 ? (
        <div className="card py-14 text-center">
          <p className="text-sm text-slate-400">Nenhuma categoria aqui ainda. Crie uma para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((cat) => (
            <div key={cat.id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${cat.color}22`, color: cat.color }}
                >
                  <CategoryIcon name={cat.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{cat.name}</p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      cat.is_savings
                        ? 'bg-amber-100 text-amber-700'
                        : cat.type === 'income'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {cat.is_savings ? 'Caixinha' : cat.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
                <button
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  onClick={() => openEdit(cat)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => handleDelete(cat)}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? 'Editar categoria' : 'Nova categoria'}</h3>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aluguel, Marketing..." required />
              </div>

              {!editing && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                      type === 'expense' ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4" />
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                      type === 'income' ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Receita
                  </button>
                </div>
              )}

              <div>
                <label className="label">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="h-8 w-8 rounded-full transition-transform"
                      style={{ background: c, outline: color === c ? '3px solid #0f172a' : 'none', outlineOffset: 2 }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <PiggyBank className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Caixinha (guardar dinheiro)</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      O valor aqui não conta como despesa/receita — vira dinheiro guardado.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSavings}
                  onClick={() => setIsSavings((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    isSavings ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      isSavings ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="label">Ícone</label>
                <div className="grid grid-cols-8 gap-1.5">
                  {PRESET_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`flex items-center justify-center rounded-lg border p-2 ${
                        icon === ic ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                      }`}
                      aria-label={`Ícone ${ic}`}
                    >
                      <CategoryIcon name={ic} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}