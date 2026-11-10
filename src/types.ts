// Core data model for Roster Desk.
// Operating calendar (Process.rule) is separate from an employee's own schedule (RosterStatus).

export type Rule = 'ALWAYS' | 'EXCEPT_HOLIDAYS' | 'EXCEPT_SUN_HOLIDAYS'
// ALWAYS = 365 days, EXCEPT_HOLIDAYS = every day except public holidays,
// EXCEPT_SUN_HOLIDAYS = closed on Sundays and public holidays

export type RosterStatus = 'W' | 'WO' | 'PH' | 'L' | 'CO'
// W working, WO weekly off, PH public holiday, L leave, CO comp-off

export interface Pod {
  id: string
  name: string
  leadId: string // an Employee id
}

export interface Employee {
  id: string
  name: string
  podId: string
  preferredOffDay: number | null // 0 = Sunday ... 6 = Saturday; a preference, never a hard rule
}

export interface Brand {
  id: string
  name: string
}

export interface Process {
  id: string
  brandId: string
  name: string // CS, ACC, NDR, RET ...
  rule: Rule
  minCoverage: number // minimum people working on every day the process operates
  minByWeekday?: Partial<Record<number, number>> // optional minimum for one weekday (0 = Sunday)
  employeeIds: string[] // many-to-many: one person can appear in several processes
}

export interface Leave {
  employeeId: string
  date: string // YYYY-MM-DD
  type: 'L' | 'CO'
}

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
}