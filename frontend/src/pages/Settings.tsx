import { useEffect, useState } from 'react'
import { Save, Trash2, Target, Wallet, LogOut } from 'lucide-react'
import api, { getErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types'
import { formatCurrency } from '../utils/format'

export default function Settings() {
  const { user, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBudget, setSavingBudget] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
    }
  }, [user])

  const loadMe = () => {
    api.get<User>('/users/me').then(({ data }) => {
      setUsername(data.username)
      setEmail(data.email)
      setMonthlyBudget(data.monthly_budget)
      setBudgetInput(data.monthly_budget != null ? String(data.monthly_budget) : '')
    }).catch(() => {})
  }

  useEffect(loadMe, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setErrors({})
    try {
      const payload: Record<string, unknown> = { username, email }
      if (currentPassword && password) {
        payload.current_password = currentPassword
        payload.password = password
      }
      const { data } = await api.put<User>('/users/me', payload)
      setUsername(data.username)
      setEmail(data.email)
      setCurrentPassword('')
      setPassword('')
    } catch (err) {
      setErrors({ profile: getErrorMessage(err) })
    } finally {
      setSavingProfile(false)
    }
  }

  const saveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBudget(true)
    try {
      const nextBudget = budgetInput.trim() === '' ? null : Number(budgetInput)
      const { data } = await api.put<User>('/users/me', { monthly_budget: nextBudget })
      setMonthlyBudget(data.monthly_budget)
      setBudgetInput(data.monthly_budget != null ? String(data.monthly_budget) : '')
    } catch (err) {
      setErrors({ budget: getErrorMessage(err) })
    } finally {
      setSavingBudget(false)
    }
  }

  const deleteAccount = async () => {
    const ok = window.confirm(
      'Tem certeza? Esta ação excluirá permanentemente sua conta, categorias e transações. Esta ação não pode ser desfeita.'
    )
    if (!ok) return
    try {
      await api.delete('/users/me')
      logout()
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold md:text-2xl">Configurações</h1>
        <p className="text-sm text-slate-500">Sua conta, orçamento e segurança.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Wallet className="h-4 w-4 text-primary-700" />
              Perfil
            </h3>
            {errors.profile && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {errors.profile}
              </div>
            )}
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="label" htmlFor="username">Nome de usuário</label>
                <input
                  id="username"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="current_password">Senha atual</label>
                  <input
                    id="current_password"
                    type="password"
                    className="input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="new_password">Nova senha</label>
                  <input
                    id="new_password"
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    placeholder="••••••••"
                    disabled={!currentPassword}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">Para alterar a senha, preencha também a senha atual.</p>
              <button type="submit" className="btn-primary" disabled={savingProfile}>
                <Save className="h-4 w-4" />
                {savingProfile ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Target className="h-4 w-4 text-primary-700" />
              Orçamento mensal
            </h3>
            {errors.budget && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {errors.budget}
              </div>
            )}
            {monthlyBudget != null && (
              <p className="mb-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
                Orçamento atual: {formatCurrency(monthlyBudget)}
              </p>
            )}
            <form onSubmit={saveBudget} className="space-y-4">
              <div>
                <label className="label" htmlFor="budget">Orçamento (R$)</label>
                <input
                  id="budget"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <p className="text-xs text-slate-400">Deixe vazio para remover o orçamento.</p>
              <button type="submit" className="btn-primary" disabled={savingBudget}>
                <Save className="h-4 w-4" />
                {savingBudget ? 'Salvando...' : 'Salvar orçamento'}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-red-600">
              <Trash2 className="h-4 w-4" />
              Zona de perigo
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Excluir sua conta remove permanentemente seu usuário, categorias e todas as transações.
            </p>
            <button className="btn-danger" onClick={deleteAccount}>
              <Trash2 className="h-4 w-4" />
              Excluir minha conta
            </button>
          </div>

          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <LogOut className="h-4 w-4 text-primary-700" />
              Sessão
            </h3>
            <button className="btn-secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}