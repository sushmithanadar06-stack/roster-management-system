import { describe, expect, it } from 'vitest'
import { brands, employees, holidays, leaves, processes } from '../seedData'
import { dayOfWeek, minFor } from './calendar'
import type { Context } from './engineTypes'
import { generateRoster } from './generate'
import { validateRoster } from './validate'

const roster = generateRoster({ year: 2026, month: 11, employees, processes, holidays, leaves })
const haven = brands.find((b) => b.name === 'Haven')!
const cs = processes.find((p) => p.brandId === haven.id && p.name === 'CS')!

describe('minimum staffing on specific days', () => {
  it('uses the weekday override when one is set', () => {
    const mondayTwo = { ...cs, minByWeekday: { 1: 2 } }
    expect(minFor(mondayTwo, '2026-11-16')).toBe(2) // a Monday
    expect(minFor(mondayTwo, '2026-11-17')).toBe(cs.minCoverage) // a Tuesday
  })
  it('flags gaps only on the weekday that needs more people', () => {
    const custom = processes.map((p) => (p.id === cs.id ? { ...cs, minByWeekday: { 1: 2 } } : p))
    const ctx: Context = { year: 2026, month: 11, employees, brands, processes: custom, holidays, roster, covers: [] }
    const errors = validateRoster(ctx).filter((i) => i.severity === 'error' && i.processId === cs.id)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.every((i) => dayOfWeek(i.date) === 1)).toBe(true)
  })
})