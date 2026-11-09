import type { Holiday, Rule } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

// All dates of a month as text, e.g. ['2026-11-01', ..., '2026-11-30']
export function monthDates(year: number, month: number): string[] {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`)
}

// 0 = Sunday ... 6 = Saturday
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function isHoliday(date: string, holidays: Holiday[]): boolean {
  return holidays.some((h) => h.date === date)
}

// Does a process need to be open on this date? This is the operating calendar.
export function isOperating(rule: Rule, date: string, holidays: Holiday[]): boolean {
  if (rule === 'ALWAYS') return true
  if (isHoliday(date, holidays)) return false
  if (rule === 'EXCEPT_SUN_HOLIDAYS') return dayOfWeek(date) !== 0
  return true
}

// Splits the month into weeks that end on Sunday. The first and last may be short.
export function weeksOf(dates: string[]): string[][] {
  const weeks: string[][] = []
  let current: string[] = []
  for (const d of dates) {
    current.push(d)
    if (dayOfWeek(d) === 0) {
      weeks.push(current)
      current = []
    }
  }
  if (current.length > 0) weeks.push(current)
  return weeks
}

export function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}