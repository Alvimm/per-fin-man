export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('pt-BR')
}

export function formatDateInput(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month) return key
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const MIN_MONTH = '2026-09'

export function atMinMonth(key: string): boolean {
  return key <= MIN_MONTH
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function initialOf(username: string): string {
  return username?.charAt(0).toUpperCase() || 'U'
}