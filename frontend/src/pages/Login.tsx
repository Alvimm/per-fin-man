import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wallet, Mail, Lock, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const result = await login(identifier, password)
    if (result.ok) {
      navigate('/')
    } else {
      setError(result.error ?? 'Falha no login.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30">
            <Wallet className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold text-white">Meu Bolso</h1>
          <p className="mt-1 text-sm text-slate-300">Controle financeiro pessoal, simples e completo.</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="identifier">
                E-mail ou nome de usuário
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  type="text"
                  className="input pl-9"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
              </div>
            </div>
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
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Não tem conta?{' '}
            <Link to="/register" className="font-semibold text-primary-700 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}