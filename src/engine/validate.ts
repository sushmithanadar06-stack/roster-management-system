import type { Process } from '../types'
import { dayOfWeek, isOperating, minFor, monthDates, shortDate } from './calendar'
import type { Context, Issue } from './engineTypes'

// How many people are working on this process on this date (own staff plus assigned covers)
export function countWorking(p: Process, date: string, ctx: Context): number {
  const own = p.employeeIds.filter((id) => ctx.roster[id]?.[date] === 'W').length
  const covering = ctx.covers.filter((c) => c.processId === p.id && c.date === date).length
  return own + covering
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function validateRoster(ctx: Context): Issue[] {
  const issues: Issue[] = []
  const dates = monthDates(ctx.year, ctx.month)
  const first = (id: string) => ctx.employees.find((e) => e.id === id)?.name.split(' ')[0] ?? id
  const brandName = (id: string) => ctx.brands.find((b) => b.id === id)?.name ?? id

  // Errors: coverage rules are mandatory
  for (const p of ctx.processes) {
    for (const d of dates) {
      if (!isOperating(p.rule, d, ctx.holidays)) continue
      const n = countWorking(p, d, ctx)
      if (n >= minFor(p, d)) continue
      const team = p.employeeIds.map((id) => `${first(id)} (${ctx.roster[id]?.[d] ?? '?'})`).join(', ')
      issues.push({
        severity: 'error',
        processId: p.id,
        date: d,
        title: `${n === 0 ? 'No one available' : 'Below minimum'}: ${brandName(p.brandId)} ${p.name}`,
        detail: `${shortDate(d)}: ${n} working, ${minFor(p, d)} required. Assigned: ${team}`,
      })
    }
  }

  // Warnings: preferences and wellbeing rules
  for (const e of ctx.employees) {
    const mine = ctx.processes.filter((p) => p.employeeIds.includes(e.id))
    let run = 0
    dates.forEach((d, i) => {
      const s = ctx.roster[e.id]?.[d]
      if (s === 'W') {
        run++
        if (run === 7) {
          issues.push({
            severity: 'warning',
            employeeId: e.id,
            date: d,
            title: `${e.name} works 7 days in a row`,
            detail: `Streak started ${shortDate(dates[i - 6])}. Consider a weekly off.`,
          })
        }
      } else {
        run = 0
      }
      if (
        s === 'WO' &&
        e.preferredOffDay !== null &&
        dayOfWeek(d) !== e.preferredOffDay &&
        mine.some((p) => isOperating(p.rule, d, ctx.holidays))
      ) {
        issues.push({
          severity: 'warning',
          employeeId: e.id,
          date: d,
          title: `${e.name}: weekly off not on preferred day`,
          detail: `${shortDate(d)} is off, preferred is ${DAY[e.preferredOffDay]}. Preference only, coverage comes first.`,
        })
      }
    })
  }

  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1))
}