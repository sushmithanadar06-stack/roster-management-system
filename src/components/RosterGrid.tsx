import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { dayOfWeek, isHoliday, isOperating, monthDates, shortDate } from '../engine/calendar'
import type { Context } from '../engine/engineTypes'
import { countWorking } from '../engine/validate'
import type { Employee, Pod, Process, RosterStatus } from '../types'
import type { CellRef, Highlight, ViewKind } from '../ui'
import { RULE_TEXT, STATUSES, STATUS_LABEL } from '../ui'

interface Props {
  ctx: Context
  pods: Pod[]
  view: ViewKind
  selectedId: string
  cell: CellRef | null
  highlight: Highlight | null
  onCell: (c: CellRef) => void
}

const LETTER = 'SMTWTFS'

// "Nuvo CS/ACC, Verdant CS" for one employee
function assignmentText(empId: string, ctx: Context): string {
  const byBrand = new Map<string, string[]>()
  for (const p of ctx.processes) {
    if (p.employeeIds.includes(empId)) byBrand.set(p.brandId, [...(byBrand.get(p.brandId) ?? []), p.name])
  }
  return [...byBrand]
    .map(([b, names]) => `${ctx.brands.find((x) => x.id === b)?.name ?? b} ${names.join('/')}`)
    .join(', ')
}

function peopleOf(procs: Process[], employees: Employee[]): Employee[] {
  const ids = new Set(procs.flatMap((p) => p.employeeIds))
  return employees.filter((e) => ids.has(e.id))
}

// Which rows (employees) and coverage rows (processes) does this view show?
function pick(ctx: Context, view: ViewKind, id: string) {
  const { employees, processes } = ctx
  // Company view groups people by pod, keeping their order inside each pod
  let rows: Employee[] = [...employees].sort((a, b) => a.podId.localeCompare(b.podId))
  let procs: Process[] = []
  if (view === 'pod') rows = employees.filter((e) => e.podId === id)
  if (view === 'brand') {
    procs = processes.filter((p) => p.brandId === id)
    rows = peopleOf(procs, employees)
  }
  if (view === 'process') {
    procs = processes.filter((p) => p.id === id)
    rows = peopleOf(procs, employees)
  }
  if (view === 'employee') rows = employees.filter((e) => e.id === id)
  return { rows, procs }
}

export default function RosterGrid({ ctx, pods, view, selectedId, cell, highlight, onCell }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const dates = monthDates(ctx.year, ctx.month)
  const { rows, procs } = pick(ctx, view, selectedId)
  const statusOf = (empId: string, d: string): RosterStatus => ctx.roster[empId]?.[d] ?? 'W'

  // When an issue is clicked, scroll the grid to that date
  useEffect(() => {
    if (!highlight || !wrap.current) return
    const i = monthDates(ctx.year, ctx.month).indexOf(highlight.date)
    if (i >= 0) wrap.current.scrollTo({ left: Math.max(0, (i - 5) * 30), behavior: 'smooth' })
  }, [highlight, ctx.year, ctx.month])

  let note = procs
    .map((p) => `${ctx.brands.find((b) => b.id === p.brandId)?.name} ${p.name}: ${RULE_TEXT[p.rule]}, minimum ${p.minCoverage}`)
    .join('. ')
  if (view === 'employee' && rows[0]) {
    const count = (s: RosterStatus) => dates.filter((d) => statusOf(rows[0].id, d) === s).length
    note = STATUSES.map((s) => `${count(s)} ${STATUS_LABEL[s].toLowerCase()}`).join(', ')
  }

  const body: ReactNode[] = []
  let lastPod = ''
  for (const e of rows) {
    if (view === 'company' && e.podId !== lastPod) {
      lastPod = e.podId
      const pod = pods.find((p) => p.id === e.podId)
      const lead = ctx.employees.find((x) => x.id === pod?.leadId)?.name ?? ''
      body.push(
        <tr key={`pod-${e.podId}`}>
          <td className="name podrow">Pod {pod?.name}, lead {lead}</td>
          <td className="podrow" colSpan={dates.length} />
        </tr>,
      )
    }
    body.push(
      <tr key={e.id}>
        <td className="name" title={assignmentText(e.id, ctx)}>
          <b>{e.name}</b>
          <small>{assignmentText(e.id, ctx)}</small>
        </td>
        {dates.map((d) => {
          const s = statusOf(e.id, d)
          const covering = ctx.covers.some((c) => c.employeeId === e.id && c.date === d)
          const hl =
            highlight?.date === d && ctx.processes.find((p) => p.id === highlight.processId)?.employeeIds.includes(e.id)
          const sel = cell?.employeeId === e.id && cell.date === d
          return (
            <td
              key={d}
              className={`cell s-${s}${sel ? ' sel' : ''}${hl ? ' hl' : ''}`}
              title={`${e.name}, ${shortDate(d)}: ${STATUS_LABEL[s]}${covering ? ' (covering another process)' : ''}`}
              onClick={() => onCell({ employeeId: e.id, date: d })}
            >
              {s}
              {covering ? '+' : ''}
            </td>
          )
        })}
      </tr>,
    )
  }
  for (const p of procs) {
    body.push(
      <tr key={`cov-${p.id}`}>
        <td className="name">
          <b>{ctx.brands.find((b) => b.id === p.brandId)?.name} {p.name} coverage</b>
          <small>minimum {p.minCoverage} working</small>
        </td>
        {dates.map((d) => {
          if (!isOperating(p.rule, d, ctx.holidays)) return <td key={d} className="cov na" title="Process closed">-</td>
          const n = countWorking(p, d, ctx)
          const hl = highlight?.processId === p.id && highlight.date === d
          return (
            <td key={d} className={`cov ${n >= p.minCoverage ? 'ok' : 'bad'}${hl ? ' hl' : ''}`}>
              {n}
            </td>
          )
        })}
      </tr>,
    )
  }

  return (
    <div>
      {note && <p className="note">{note}</p>}
      <div className="grid-wrap" ref={wrap}>
        <table className="grid">
          <thead>
            <tr>
              <th className="name">Employee</th>
              {dates.map((d) => (
                <th
                  key={d}
                  className={isHoliday(d, ctx.holidays) ? 'hol' : dayOfWeek(d) === 0 ? 'sun' : ''}
                  title={ctx.holidays.find((h) => h.date === d)?.name ?? shortDate(d)}
                >
                  {LETTER[dayOfWeek(d)]}
                  <br />
                  {Number(d.slice(8))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
    </div>
  )
}