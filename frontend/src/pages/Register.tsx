import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wallet, User as UserIcon, Mail, Lock, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    const result = await register(username, email, password)
    if (result.ok) {
      navigate('/')
    } else {
      setError(result.error ?? 'Falha no cadastro.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30">
            <Wallet className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold text-white">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-300">Comece a organizar suas finanças hoje.</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="username">
                Nome de usuário
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  className="input pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  placeholder="seu.nome"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  className="input pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="password">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    className="input pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="confirm">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm"
                    type="password"
                    className="input pl-9"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={6}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/login" className="font-semibold text-primary-700 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}