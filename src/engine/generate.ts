import type { Employee, Holiday, Leave, Process } from '../types'
import type { Roster } from './engineTypes'
import { dayOfWeek, isHoliday, isOperating, minFor, monthDates, weeksOf } from './calendar'
interface Input {
  year: number
  month: number
  employees: Employee[]
  processes: Process[]
  holidays: Holiday[]
  leaves: Leave[]
}

// Puts leaves and comp-offs on top of a roster. Returns a new roster.
export function applyLeaves(roster: Roster, leaves: Leave[]): Roster {
  const copy: Roster = {}
  for (const id of Object.keys(roster)) copy[id] = { ...roster[id] }
  for (const l of leaves) {
    const row = copy[l.employeeId]
    if (row && l.date in row) row[l.date] = l.type
  }
  return copy
}

export function generateRoster(input: Input): Roster {
  const { year, month, employees, processes, holidays, leaves } = input
  const dates = monthDates(year, month)

  // Stage 1: if none of an employee's processes is open that day, it is a day off by itself
  const base: Roster = {}
  for (const e of employees) {
    base[e.id] = {}
    const mine = processes.filter((p) => p.employeeIds.includes(e.id))
    for (const d of dates) {
      const open = mine.some((p) => isOperating(p.rule, d, holidays))
      base[e.id][d] = open ? 'W' : isHoliday(d, holidays) ? 'PH' : 'WO'
    }
  }

  // Stage 2: approved leaves and comp-offs
  const roster = applyLeaves(base, leaves)

  // Stage 3: one weekly off per employee per week
  const weeks = weeksOf(dates)
  let lastFullWeek = -1
  weeks.forEach((w, i) => {
    if (w.length >= 4) lastFullWeek = i
  })
  const offCount: Record<string, number> = {} // how many people are off on each date

  for (const e of employees) {
    const mine = processes.filter((p) => p.employeeIds.includes(e.id))
    weeks.forEach((week, wi) => {
      if (week.length < 4) return // too short to need its own weekly off

      const alreadyOff = week.some((d) => {
        const s = roster[e.id][d]
        return s === 'WO' || s === 'CO' || (s === 'PH' && dayOfWeek(d) === 0)
      })
      if (alreadyOff) return

      let best: string | null = null
      let bestScore = Infinity
      for (const d of week) {
        if (roster[e.id][d] !== 'W') continue
        let score = (offCount[d] ?? 0) * 2 // spread offs across days

        for (const p of mine) {
          if (!isOperating(p.rule, d, holidays)) continue
          const others = p.employeeIds.filter((x) => x !== e.id && roster[x]?.[d] === 'W').length
          if (others < minFor(p, d)) score += 1000
        }
        if (e.preferredOffDay === dayOfWeek(d)) score -= 8 // preference

        const i = dates.indexOf(d)
        let left = 0
        while (i - 1 - left >= 0 && roster[e.id][dates[i - 1 - left]] === 'W') left++
        if (left > 6) score += 300 // would mean 7+ days in a row
        if (wi === lastFullWeek && dates.length - 1 - i > 6) score += 300

        if (score < bestScore) {
          bestScore = score
          best = d
        }
      }
      if (best) {
        roster[e.id][best] = 'WO'
        offCount[best] = (offCount[best] ?? 0) + 1
      }
    })
  }
  return roster
}