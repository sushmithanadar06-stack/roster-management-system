import { useEffect, useMemo, useState } from 'react'
import RosterGrid from './components/RosterGrid'
import SetupPanel from './components/SetupPanel'
import SidePanel from './components/SidePanel'
import type { Context, Cover, Issue, Roster } from './engine/engineTypes'
import { applyLeaves, generateRoster } from './engine/generate'
import type { Suggestion } from './engine/suggest'
import { validateRoster } from './engine/validate'
import type { AppData, Saved } from './storage'
import { clearSaved, loadSaved, sampleData, saveState } from './storage'
import type { Leave, RosterStatus } from './types'
import type { CellRef, Highlight, ViewKind } from './ui'
import { STATUS_LABEL } from './ui'

const plan = (d: AppData, year: number, month: number): Roster =>
  generateRoster({ year, month, employees: d.employees, processes: d.processes, holidays: d.holidays, leaves: d.leaves })

// Start from what the browser saved, or from the sample data
function startState(): Saved {
  const saved = loadSaved()
  if (saved) return saved
  const data = sampleData()
  return { data, year: 2026, month: 11, roster: plan(data, 2026, 11), covers: [] }
}

const VIEWS: { id: ViewKind; label: string }[] = [
  { id: 'company', label: 'Company view' },
  { id: 'pod', label: 'Pod view' },
  { id: 'brand', label: 'Brand view' },
  { id: 'process', label: 'Process view' },
  { id: 'employee', label: 'Employee view' },
]

export default function App() {
  const [start] = useState(startState)
  const [data, setData] = useState<AppData>(start.data)
  const [ym, setYm] = useState({ year: start.year, month: start.month })
  const [roster, setRoster] = useState<Roster>(start.roster)
  const [covers, setCovers] = useState<Cover[]>(start.covers)
  const [tab, setTab] = useState<'roster' | 'setup'>('roster')
  const [view, setView] = useState<ViewKind>('company')
  const [pickedId, setPickedId] = useState('')
  const [cell, setCell] = useState<CellRef | null>(null)
  const [highlight, setHighlight] = useState<Highlight | null>(null)
  const [message, setMessage] = useState('')
  const [published, setPublished] = useState(false)
  const { pods, employees, brands, processes, holidays } = data

  useEffect(() => {
    saveState({ data, year: ym.year, month: ym.month, roster, covers })
  }, [data, ym, roster, covers])

  const ctx: Context = useMemo(
    () => ({ year: ym.year, month: ym.month, employees, brands, processes, holidays, roster, covers }),
    [ym, employees, brands, processes, holidays, roster, covers],
  )
  const issues = useMemo(() => validateRoster(ctx), [ctx])
  const errors = issues.filter((i) => i.severity === 'error').length
  const monthName = new Date(Date.UTC(ym.year, ym.month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? id
  const options: { id: string; label: string }[] =
    view === 'pod'
      ? pods.map((p) => ({ id: p.id, label: `Pod ${p.name} (lead ${employees.find((e) => e.id === p.leadId)?.name ?? ''})` }))
      : view === 'brand'
        ? brands.map((b) => ({ id: b.id, label: b.name }))
        : view === 'process'
          ? processes.map((p) => ({ id: p.id, label: `${brandName(p.brandId)} ${p.name}` }))
          : view === 'employee'
            ? employees.map((e) => ({ id: e.id, label: e.name }))
            : []
  const selectedId = options.some((o) => o.id === pickedId) ? pickedId : (options[0]?.id ?? '')

  function resetView() {
    setCovers([])
    setHighlight(null)
    setCell(null)
  }

  // Setup changes: save the new data and re-plan the roster
  function changeData(next: AppData, text: string) {
    setData(next)
    setRoster(plan(next, ym.year, ym.month))
    resetView()
    setPublished(false)
    setMessage(text)
  }

  function goMonth(delta: number) {
    let y = ym.year
    let m = ym.month + delta
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setYm({ year: y, month: m })
    setRoster(plan(data, y, m))
    resetView()
    setMessage('')
  }

  function regenerate(text: string) {
    setRoster(plan(data, ym.year, ym.month))
    resetView()
    setPublished(false)
    setMessage(text)
  }

  function resetSample() {
    clearSaved()
    const fresh = sampleData()
    setData(fresh)
    setYm({ year: 2026, month: 11 })
    setRoster(plan(fresh, 2026, 11))
    resetView()
    setPublished(false)
    setMessage('Sample data restored.')
  }

  function setStatus(c: CellRef, s: RosterStatus) {
    setRoster((r) => ({ ...r, [c.employeeId]: { ...r[c.employeeId], [c.date]: s } }))
    setMessage(`${employees.find((e) => e.id === c.employeeId)?.name} set to ${STATUS_LABEL[s]} on ${c.date}.`)
  }

  function addLeaves(ls: Leave[]): Roster {
    const next = applyLeaves(roster, ls)
    setData((d) => ({
      ...d,
      leaves: [...d.leaves.filter((p) => !ls.some((l) => l.employeeId === p.employeeId && l.date === p.date)), ...ls],
    }))
    setRoster(next)
    return next
  }

  function onAddLeave(employeeId: string, date: string, type: 'L' | 'CO') {
    const next = addLeaves([{ employeeId, date, type }])
    const n = validateRoster({ ...ctx, roster: next }).filter((i) => i.severity === 'error').length
    const who = employees.find((e) => e.id === employeeId)?.name
    setMessage(`${who} added as ${type === 'L' ? 'leave' : 'comp-off'} on ${date}. ${n === 0 ? 'Coverage is still met.' : `${n} coverage errors now. Open an issue for backup options.`}`)
  }

  function onDemo(kind: 'single' | 'shared') {
    const who = kind === 'single' ? 'Rohan' : 'Farah'
    const brand = brands.find((b) => b.name === (kind === 'single' ? 'Haven' : 'Lumora'))
    const emp = employees.find((e) => e.name.startsWith(who))
    if (!brand || !emp) {
      setMessage('The demo needs the sample people and brands. Use Reset to sample data in Setup.')
      return
    }
    const days = kind === 'single' ? [17, 18] : [17, 18, 19]
    const ls: Leave[] = days.map((d) => ({
      employeeId: emp.id,
      date: `${ym.year}-${String(ym.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      type: 'L',
    }))
    const next = addLeaves(ls)
    const found = validateRoster({ ...ctx, roster: next }).filter(
      (i) => i.severity === 'error' && processes.find((p) => p.id === i.processId)?.brandId === brand.id,
    )
    if (kind === 'single') {
      setMessage(`${emp.name} is the only person on ${brand.name}. His leave on ${days.join(' and ')} Nov opened ${found.length} coverage gaps. Click an issue for backup options.`)
    } else {
      setMessage(
        found.length === 0
          ? `${emp.name} is out ${days.join(', ')} Nov, but ${brand.name} is still covered by the other two.`
          : `${emp.name} is out ${days.join(', ')} Nov. ${brand.name} needs 2 of 3, and ${found.length} day(s) now fall short because another person has a weekly off.`,
      )
    }
    const first = found[0]
    if (first?.processId) {
      setView('brand')
      setPickedId(brand.id)
      setHighlight({ processId: first.processId, date: first.date })
    }
  }

  function onIssue(i: Issue) {
    if (i.processId) {
      setView('process')
      setPickedId(i.processId)
      setHighlight({ processId: i.processId, date: i.date })
    } else if (i.employeeId) {
      setView('employee')
      setPickedId(i.employeeId)
      setHighlight(null)
      setCell({ employeeId: i.employeeId, date: i.date })
    }
  }

  function onApply(i: Issue, s: Suggestion) {
    if (s.kind === 'cover' && i.processId) {
      const processId = i.processId
      setCovers((c) => [...c, { employeeId: s.employeeId, processId, date: i.date }])
    } else {
      setRoster((r) => ({ ...r, [s.employeeId]: { ...r[s.employeeId], [i.date]: 'W' } }))
    }
    setHighlight(null)
    setMessage(`Applied: ${s.text}.`)
  }

  function onPublish() {
    if (errors > 0) {
      setMessage(`Cannot publish: ${errors} coverage errors need attention first.`)
    } else {
      setPublished(true)
      setMessage('Roster published. Pod leads can now see it.')
    }
  }

  return (
    <>
      <header className="top">
        <h1>Roster Desk</h1>
        <nav className="tabs">
          <button className={tab === 'roster' ? 'on' : ''} onClick={() => setTab('roster')}>Roster</button>
          <button className={tab === 'setup' ? 'on' : ''} onClick={() => setTab('setup')}>Setup</button>
        </nav>
        <span className="spacer" />
        <button onClick={() => goMonth(-1)} aria-label="Previous month">‹</button>
        <b>{monthName}</b>
        <button onClick={() => goMonth(1)} aria-label="Next month">›</button>
        <button className="primary" onClick={() => regenerate('Roster generated. Leaves and comp-offs were kept, manual edits were cleared.')}>
          Generate roster
        </button>
        <button onClick={onPublish}>{published && errors === 0 ? 'Published ✓' : 'Publish'}</button>
      </header>

      {tab === 'setup' ? (
        <>
          {message && <div className="msg setupmsg" role="status">{message}</div>}
          <SetupPanel data={data} onChange={changeData} onReset={resetSample} />
        </>
      ) : (
        <main className="layout">
          <section>
            <div className="card stats">
              <span><b>{employees.length}</b> employees</span>
              <span><b>{brands.length}</b> brands</span>
              <span><b>{processes.length}</b> processes</span>
              <span className="err"><b>{errors}</b> errors</span>
              <span><b>{issues.length - errors}</b> warnings</span>
            </div>
            {message && <div className="msg" role="status">{message}</div>}

            <div className="toolbar">
              <select
                value={view}
                onChange={(e) => {
                  setView(e.target.value as ViewKind)
                  setPickedId('')
                  setHighlight(null)
                }}
                aria-label="View"
              >
                {VIEWS.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              {options.length > 0 && (
                <select value={selectedId} onChange={(e) => { setPickedId(e.target.value); setHighlight(null) }} aria-label="Choose">
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              )}
              <span className="legend">
                {(['W', 'WO', 'PH', 'L', 'CO'] as RosterStatus[]).map((s) => (
                  <span key={s} className={`s-${s}`}>{s} {STATUS_LABEL[s]}</span>
                ))}
              </span>
            </div>

            <RosterGrid ctx={ctx} pods={pods} view={view} selectedId={selectedId} cell={cell} highlight={highlight} onCell={setCell} />
          </section>

          <SidePanel
            ctx={ctx}
            issues={issues}
            cell={cell}
            onSetStatus={setStatus}
            onIssue={onIssue}
            onApply={onApply}
            onAddLeave={onAddLeave}
            onDemo={onDemo}
            onReplan={() => regenerate('Weekly offs re-planned around all leaves and comp-offs.')}
            onReset={resetSample}
          />
        </main>
      )}
    </>
  )
}