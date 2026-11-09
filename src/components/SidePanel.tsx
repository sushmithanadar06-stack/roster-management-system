import { useState } from 'react'
import type { Context, Issue } from '../engine/engineTypes'
import { shortDate } from '../engine/calendar'
import type { Suggestion } from '../engine/suggest'
import { suggestBackups } from '../engine/suggest'
import type { RosterStatus } from '../types'
import type { CellRef } from '../ui'
import { STATUSES, STATUS_LABEL } from '../ui'

interface Props {
  ctx: Context
  issues: Issue[]
  cell: CellRef | null
  onSetStatus: (c: CellRef, s: RosterStatus) => void
  onIssue: (i: Issue) => void
  onApply: (i: Issue, s: Suggestion) => void
  onAddLeave: (employeeId: string, date: string, type: 'L' | 'CO') => void
  onDemo: (kind: 'single' | 'shared') => void
  onReplan: () => void
  onReset: () => void
}

export default function SidePanel({ ctx, issues, cell, onSetStatus, onIssue, onApply, onAddLeave, onDemo, onReplan, onReset }: Props) {
  const [empId, setEmpId] = useState(ctx.employees[0]?.id ?? '')
  const [date, setDate] = useState(`${ctx.year}-${String(ctx.month).padStart(2, '0')}-17`)
  const [type, setType] = useState<'L' | 'CO'>('L')
  const cellEmp = cell ? ctx.employees.find((e) => e.id === cell.employeeId) : undefined

  return (
    <aside>
      {cell && cellEmp && (
        <div className="card">
          <h3>
            Edit {cellEmp.name}, {shortDate(cell.date)}
          </h3>
          <p className="mut">Now: {STATUS_LABEL[ctx.roster[cell.employeeId]?.[cell.date] ?? 'W']}. Changes are checked straight away.</p>
          <div className="row">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => onSetStatus(cell, s)}>
                {s} {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Issues ({issues.length})</h3>
        {issues.length === 0 && <p className="mut">No conflicts. Every required day is covered.</p>}
        {issues.slice(0, 20).map((i, k) => {
          const proc = i.processId ? ctx.processes.find((p) => p.id === i.processId) : undefined
          const options = i.severity === 'error' && proc ? suggestBackups(proc, i.date, ctx) : []
          return (
            <div key={`${i.title}-${i.date}-${k}`} className={`issue ${i.severity}`} onClick={() => onIssue(i)}>
              <b>{i.title}</b>
              <small>{i.detail}</small>
              {options.map((s) => (
                <button
                  key={`${s.kind}-${s.employeeId}`}
                  className="fix"
                  onClick={(e) => {
                    e.stopPropagation()
                    onApply(i, s)
                  }}
                >
                  {s.text}
                </button>
              ))}
              {i.severity === 'error' && options.length === 0 && <small>No safe backup found. Needs a manager decision.</small>}
            </div>
          )
        })}
        {issues.length > 20 && <p className="mut">{issues.length - 20} more not shown.</p>}
      </div>

      <div className="card">
        <h3>Handle a change</h3>
        <p className="mut">Add a leave after the roster is generated. Coverage is re-checked at once.</p>
        <div className="row">
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} aria-label="Employee">
            {ctx.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          <select value={type} onChange={(e) => setType(e.target.value === 'CO' ? 'CO' : 'L')} aria-label="Type">
            <option value="L">Leave</option>
            <option value="CO">Comp-off</option>
          </select>
          <button className="primary" onClick={() => date && onAddLeave(empId, date, type)}>
            Add
          </button>
        </div>
        <div className="row">
          <button onClick={() => onDemo('single')}>Demo: single-person brand (Rohan, Haven)</button>
          <button onClick={() => onDemo('shared')}>Demo: 1 of 3 out (Farah, Lumora)</button>
          <button onClick={onReplan}>Re-plan weekly offs around changes</button>
          <button onClick={onReset}>Reset sample data</button>
        </div>
      </div>
    </aside>
  )
}