import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label="Alternar tema claro/escuro"
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}