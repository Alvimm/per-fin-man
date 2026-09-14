import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { initialOf } from '../utils/format'
import ThemeToggle from './ThemeToggle'

const NAV_MAIN = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Ajustes', icon: SettingsIcon },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
        <Wallet className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold text-white tracking-tight">Meu Bolso</span>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 md:flex">
        <div className="px-5 py-6">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_MAIN.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          {user && (
            <div className="flex items-center gap-3 px-1 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                {initialOf(user.username)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle className="flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white" />
            <button
              onClick={handleLogout}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="md:pl-64">
        {/* Header — mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-slate-900 px-4 py-3 dark:bg-slate-900 md:hidden">
          <Brand />
          <div className="flex items-center gap-2.5">
            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white" />
            {user && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                {initialOf(user.username)}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-300"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
        <div className="grid grid-cols-5">
          {NAV_MAIN.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-primary-700 dark:text-primary-500' : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}