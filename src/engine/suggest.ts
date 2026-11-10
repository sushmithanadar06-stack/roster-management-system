import type { Process } from '../types'
import { isOperating, minFor } from './calendar'
import type { Context } from './engineTypes'
import { countWorking } from './validate'

export interface Suggestion {
  kind: 'cover' | 'work-weekly-off'
  employeeId: string
  score: number
  text: string
}

// Who could fix a coverage gap on this process and date? Best options first.
export function suggestBackups(p: Process, date: string, ctx: Context): Suggestion[] {
  const out: Suggestion[] = []
  const podOf = (id: string) => ctx.employees.find((e) => e.id === id)?.podId
  const mainPod = podOf(p.employeeIds[0])

  for (const e of ctx.employees) {
    if (p.employeeIds.includes(e.id)) continue
    if (ctx.roster[e.id]?.[date] !== 'W') continue
    // Busy covering a different brand that day? Skip. The same brand is fine: it is the same job.
    const busyElsewhere = ctx.covers.some(
      (c) =>
        c.employeeId === e.id &&
        c.date === date &&
        ctx.processes.find((q) => q.id === c.processId)?.brandId !== p.brandId,
    )
    if (busyElsewhere) continue
    const alreadyOnBrand = ctx.covers.some((c) => c.employeeId === e.id && c.date === date)

    // Only suggest someone whose own processes stay covered without them
    const mine = ctx.processes.filter((q) => q.employeeIds.includes(e.id))
    const canSpare = mine.every(
      (q) => !isOperating(q.rule, date, ctx.holidays) || countWorking(q, date, ctx) - 1 >= minFor(q, date),
    )
    if (!canSpare) continue

    const sameSkill = mine.some((q) => q.name === p.name)
    const score = (e.podId === mainPod ? 2 : 0) + (sameSkill ? 3 : 0) + (alreadyOnBrand ? 4 : 0)
    out.push({
      kind: 'cover',
      employeeId: e.id,
      score,
      text: `Assign ${e.name} to cover${alreadyOnBrand ? ' (already covering this brand that day)' : ''}${sameSkill ? ' (same process)' : ''}${e.podId === mainPod ? ' (same pod)' : ''}`,
    })
  }

  // Or ask an assigned person to work their weekly off (a comp-off is owed)
  for (const id of p.employeeIds) {
    if (ctx.roster[id]?.[date] === 'WO') {
      const name = ctx.employees.find((e) => e.id === id)?.name ?? id
      out.push({ kind: 'work-weekly-off', employeeId: id, score: 1, text: `Ask ${name} to work the weekly off, grant a comp-off later` })
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 3)
}