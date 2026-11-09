import type { Rule, RosterStatus } from './types'

export type ViewKind = 'company' | 'pod' | 'brand' | 'process' | 'employee'

export interface CellRef {
  employeeId: string
  date: string
}

// The process and day the manager clicked in the issues list
export interface Highlight {
  processId: string
  date: string
}

export const STATUSES: RosterStatus[] = ['W', 'WO', 'PH', 'L', 'CO']

export const STATUS_LABEL: Record<RosterStatus, string> = {
  W: 'Working',
  WO: 'Weekly off',
  PH: 'Public holiday',
  L: 'Leave',
  CO: 'Comp-off',
}

export const RULE_TEXT: Record<Rule, string> = {
  ALWAYS: 'Open 365 days',
  EXCEPT_HOLIDAYS: 'Open every day except public holidays',
  EXCEPT_SUN_HOLIDAYS: 'Closed on Sundays and public holidays',
}