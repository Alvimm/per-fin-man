import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { getErrorMessage } from '../api/client'
import type { User } from '../types'

interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthContextValue {
  user: User | null
  setUser: (user: User) => void
  login: (identifier: string, password: string) => Promise<AuthResult>
  register: (username: string, email: string, password: string) => Promise<AuthResult>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(readStoredUser)
  const [loading, setLoading] = useState(false)

  const persist = useCallback((token: string, userData: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUserState(userData)
  }, [])

  const login = useCallback(
    async (identifier: string, password: string): Promise<AuthResult> => {
      setLoading(true)
      try {
        const { data } = await api.post<{ access_token: string; user: User }>('/auth/login', {
          identifier,
          password,
        })
        persist(data.access_token, data.user)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Falha no login.') }
      } finally {
        setLoading(false)
      }
    },
    [persist]
  )

  const register = useCallback(
    async (username: string, email: string, password: string): Promise<AuthResult> => {
      setLoading(true)
      try {
        const { data } = await api.post<{ access_token: string; user: User }>('/auth/register', {
          username,
          email,
          password,
        })
        persist(data.access_token, data.user)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: getErrorMessage(error, 'Falha no cadastro.') }
      } finally {
        setLoading(false)
      }
    },
    [persist]
  )

  const setUser = useCallback((userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUserState(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUserState(null)
  }, [])

  useEffect(() => {
    const handler = () => setUserState(null)
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}