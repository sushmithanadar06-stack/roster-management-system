import { monthDates } from './engine/calendar'
import type { Cover, Roster } from './engine/engineTypes'
import { brands, employees, holidays, leaves, pods, processes } from './seedData'
import type { Brand, Employee, Holiday, Leave, Pod, Process } from './types'

// Everything a manager can change in the Setup tab
export interface AppData {
  pods: Pod[]
  employees: Employee[]
  brands: Brand[]
  processes: Process[]
  holidays: Holiday[]
  leaves: Leave[]
}

export interface Saved {
  data: AppData
  year: number
  month: number
  roster: Roster
  covers: Cover[]
}

const KEY = 'roster-desk-saved-v1'

export function sampleData(): AppData {
  return JSON.parse(JSON.stringify({ pods, employees, brands, processes, holidays, leaves })) as AppData
}

// A saved roster is only used if it matches the saved team and month
function isConsistent(s: Saved): boolean {
  const dates = monthDates(s.year, s.month)
  return s.data.employees.every((e) => dates.every((d) => s.roster[e.id]?.[d] !== undefined))
}

export function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Saved
    return s.data && s.roster && isConsistent(s) ? s : null
  } catch {
    return null
  }
}

export function saveState(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // storage is full or blocked: the app still works, it just will not remember
  }
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}