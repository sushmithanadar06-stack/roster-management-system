import type { Brand, Employee, Holiday, Process, RosterStatus } from '../types'

// roster[employeeId][date] = status. Dates look like '2026-11-17'.
export type Roster = Record<string, Record<string, RosterStatus>>

// A manager assigns an extra person to cover one process on one day.
export interface Cover {
  employeeId: string
  processId: string
  date: string
}

export interface Issue {
  severity: 'error' | 'warning'
  processId?: string
  employeeId?: string
  date: string
  title: string
  detail: string
}

// Everything the validator and the suggestions need, in one object.
export interface Context {
  year: number
  month: number // 1 to 12
  employees: Employee[]
  brands: Brand[]
  processes: Process[]
  holidays: Holiday[]
  roster: Roster
  covers: Cover[]
}