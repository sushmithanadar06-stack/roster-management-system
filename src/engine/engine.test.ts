import { describe, expect, it } from 'vitest'
import { brands, employees, holidays, leaves, processes } from '../seedData'
import { dayOfWeek, isOperating, monthDates, weeksOf } from './calendar'
import type { Context, Cover } from './engineTypes'
import { applyLeaves, generateRoster } from './generate'
import { suggestBackups } from './suggest'
import { validateRoster } from './validate'

const roster = generateRoster({ year: 2026, month: 11, employees, processes, holidays, leaves })
const ctxFor = (r = roster, covers: Cover[] = []): Context => ({
  year: 2026, month: 11, employees, brands, processes, holidays, roster: r, covers,
})
const proc = (brand: string, name: string) => {
  const b = brands.find((x) => x.name === brand)!
  return processes.find((p) => p.brandId === b.id && p.name === name)!
}
const emp = (first: string) => employees.find((e) => e.name.startsWith(first))!.id
const errorsFor = (r: typeof roster, brand: string) =>
  validateRoster(ctxFor(r)).filter(
    (i) => i.severity === 'error' && processes.find((p) => p.id === i.processId)?.brandId === brands.find((b) => b.name === brand)!.id,
  )

describe('operating calendar', () => {
  it('365-day process works on Sundays and holidays', () => {
    expect(isOperating('ALWAYS', '2026-11-08', holidays)).toBe(true)
    expect(isOperating('ALWAYS', '2026-11-11', holidays)).toBe(true)
  })
  it('every-day-except-holidays process is closed only on holidays', () => {
    expect(isOperating('EXCEPT_HOLIDAYS', '2026-11-11', holidays)).toBe(false)
    expect(isOperating('EXCEPT_HOLIDAYS', '2026-11-15', holidays)).toBe(true) // a Sunday
  })
  it('Sunday-off process is closed on Sundays and holidays', () => {
    expect(isOperating('EXCEPT_SUN_HOLIDAYS', '2026-11-15', holidays)).toBe(false)
    expect(isOperating('EXCEPT_SUN_HOLIDAYS', '2026-11-24', holidays)).toBe(false)
    expect(isOperating('EXCEPT_SUN_HOLIDAYS', '2026-11-16', holidays)).toBe(true)
  })
})

describe('generated roster', () => {
  it('has no coverage errors for the sample data', () => {
    expect(validateRoster(ctxFor()).filter((i) => i.severity === 'error')).toEqual([])
  })
  it('gives every employee a day off in every full week', () => {
    for (const week of weeksOf(monthDates(2026, 11)).filter((w) => w.length >= 4)) {
      for (const e of employees) {
        const off = week.some((d) => {
          const s = roster[e.id][d]
          return s === 'WO' || s === 'CO' || (s === 'PH' && dayOfWeek(d) === 0)
        })
        expect(off).toBe(true)
      }
    }
  })
  it('keeps the sample leaves', () => {
    expect(roster[emp('Isha')]).toBeDefined()
    expect(roster[leaves[0].employeeId][leaves[0].date]).toBe('L')
  })
})

describe('handling a change', () => {
  const rohan = emp('Rohan')
  const changed = applyLeaves(roster, [{ employeeId: rohan, date: '2026-11-17', type: 'L' }])

  it('flags a gap when the only employee of a brand takes leave', () => {
    const issues = errorsFor(changed, 'Haven').filter((i) => i.date === '2026-11-17')
    expect(issues).toHaveLength(2) // CS and ACC
  })
  it('suggests backups who are working and not already assigned', () => {
    const p = proc('Haven', 'CS')
    const list = suggestBackups(p, '2026-11-17', ctxFor(changed))
    expect(list.length).toBeGreaterThan(0)
    for (const s of list) {
      if (s.kind === 'cover') {
        expect(changed[s.employeeId]['2026-11-17']).toBe('W')
        expect(p.employeeIds).not.toContain(s.employeeId)
      }
    }
  })
  it('clears the error once a cover is assigned', () => {
    const p = proc('Haven', 'CS')
    const first = suggestBackups(p, '2026-11-17', ctxFor(changed)).find((s) => s.kind === 'cover')!
    const covers: Cover[] = [{ employeeId: first.employeeId, processId: p.id, date: '2026-11-17' }]
    const left = validateRoster(ctxFor(changed, covers)).filter(
      (i) => i.severity === 'error' && i.processId === p.id && i.date === '2026-11-17',
    )
    expect(left).toEqual([])
  })
  it('lets one backup cover both processes of the same brand on the same day', () => {
    const cs = proc('Haven', 'CS')
    const acc = proc('Haven', 'ACC')
    const first = suggestBackups(cs, '2026-11-17', ctxFor(changed)).find((s) => s.kind === 'cover')!
    const covers: Cover[] = [{ employeeId: first.employeeId, processId: cs.id, date: '2026-11-17' }]
    const next = suggestBackups(acc, '2026-11-17', ctxFor(changed, covers))
    expect(next[0].employeeId).toBe(first.employeeId)
  })
  it('flags Lumora when two of its three people are out', () => {
    const r = applyLeaves(roster, [
      { employeeId: emp('Neel'), date: '2026-11-17', type: 'L' },
      { employeeId: emp('Farah'), date: '2026-11-17', type: 'L' },
    ])
    expect(errorsFor(r, 'Lumora').some((i) => i.date === '2026-11-17')).toBe(true)
  })
})