import { useState } from 'react'
import type { AppData } from '../storage'
import type { Process, Rule } from '../types'
import { RULE_TEXT } from '../ui'

interface Props {
  data: AppData
  onChange: (next: AppData, message: string) => void
  onReset: () => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`

export default function SetupPanel({ data, onChange, onReset }: Props) {
  const { pods, employees, brands, processes, holidays, leaves } = data
  const [note, setNote] = useState('')
  const [empName, setEmpName] = useState('')
  const [empPod, setEmpPod] = useState('')
  const [podName, setPodName] = useState('')
  const [podLead, setPodLead] = useState('')
  const [brandName, setBrandName] = useState('')
  const [procBrand, setProcBrand] = useState('')
  const [procName, setProcName] = useState('')
  const [holDate, setHolDate] = useState('')
  const [holName, setHolName] = useState('')
  const [adding, setAdding] = useState<Record<string, string>>({})

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id
  const brandOf = (id: string) => brands.find((b) => b.id === id)?.name ?? id
  const podChoice = pods.some((p) => p.id === empPod) ? empPod : (pods[0]?.id ?? '')
  const brandChoice = brands.some((b) => b.id === procBrand) ? procBrand : (brands[0]?.id ?? '')
  const leadChoice = employees.some((e) => e.id === podLead) ? podLead : (employees[0]?.id ?? '')

  const change = (next: Partial<AppData>, message: string) => {
    setNote('')
    onChange({ ...data, ...next }, message)
  }
  const setProc = (id: string, patch: Partial<Process>, message: string) =>
    change({ processes: processes.map((p) => (p.id === id ? { ...p, ...patch } : p)) }, message)

  function addEmployee() {
    const name = empName.trim()
    if (!name || !podChoice) {
      setNote('Enter a name and choose a pod.')
      return
    }
    setEmpName('')
    change(
      { employees: [...employees, { id: uid('e'), name, podId: podChoice, preferredOffDay: null }] },
      `${name} added. Assign them to a process below, and the roster is re-planned.`,
    )
  }

  function removeEmployee(id: string) {
    if (pods.some((p) => p.leadId === id)) {
      setNote('This person is a pod lead. Choose another lead for that pod first.')
      return
    }
    change(
      {
        employees: employees.filter((e) => e.id !== id),
        processes: processes.map((p) => ({ ...p, employeeIds: p.employeeIds.filter((x) => x !== id) })),
        leaves: leaves.filter((l) => l.employeeId !== id),
      },
      `${nameOf(id)} removed from the team and from every process.`,
    )
  }

  function addPod() {
    const name = podName.trim()
    if (!name || !leadChoice) {
      setNote('Enter a pod name and choose a lead.')
      return
    }
    setPodName('')
    change({ pods: [...pods, { id: uid('pod'), name, leadId: leadChoice }] }, `Pod ${name} added.`)
  }

  function removePod(id: string) {
    if (employees.some((e) => e.podId === id)) {
      setNote('This pod still has employees. Move or remove them first.')
      return
    }
    change({ pods: pods.filter((p) => p.id !== id) }, 'Pod removed.')
  }

  function addBrand() {
    const name = brandName.trim()
    if (!name) {
      setNote('Enter a brand name.')
      return
    }
    setBrandName('')
    change({ brands: [...brands, { id: uid('b'), name }] }, `Brand ${name} added. Add a process for it below.`)
  }

  function removeBrand(id: string) {
    change(
      { brands: brands.filter((b) => b.id !== id), processes: processes.filter((p) => p.brandId !== id) },
      `${brandOf(id)} and its processes removed.`,
    )
  }

  function addProcess() {
    const name = procName.trim()
    if (!name || !brandChoice) {
      setNote('Choose a brand and enter a process name.')
      return
    }
    setProcName('')
    change(
      {
        processes: [
          ...processes,
          { id: uid('p'), brandId: brandChoice, name, rule: 'EXCEPT_SUN_HOLIDAYS', minCoverage: 1, employeeIds: [] },
        ],
      },
      `${brandOf(brandChoice)} ${name} added. Assign people to it.`,
    )
  }

  function setWeekday(p: Process, day: number, value: string) {
    const map = { ...(p.minByWeekday ?? {}) }
    if (value === '') delete map[day]
    else map[day] = Math.max(0, Number(value))
    setProc(p.id, { minByWeekday: Object.keys(map).length > 0 ? map : undefined }, 'Day minimum updated.')
  }

  function addHoliday() {
    if (!holDate) {
      setNote('Choose a holiday date.')
      return
    }
    const next = [...holidays.filter((h) => h.date !== holDate), { date: holDate, name: holName.trim() || 'Holiday' }]
    setHolDate('')
    setHolName('')
    change({ holidays: next.sort((a, b) => a.date.localeCompare(b.date)) }, 'Holiday added. Weekly offs re-planned.')
  }

  return (
    <main className="setup">
      <div className="card">
        <h3>Setup</h3>
        <p className="mut">
          Add, edit or remove people, pods, brands, processes, holidays and leaves here. The roster is re-planned after each change, and everything is
          saved in this browser.
        </p>
        {note && <div className="msg" role="alert">{note}</div>}
        <button onClick={onReset}>Reset to sample data</button>
      </div>

      <div className="card">
        <h3>Employees ({employees.length})</h3>
        <div className="row">
          <input placeholder="New employee name" value={empName} onChange={(e) => setEmpName(e.target.value)} aria-label="New employee name" />
          <select value={podChoice} onChange={(e) => setEmpPod(e.target.value)} aria-label="Pod for new employee">
            {pods.map((p) => <option key={p.id} value={p.id}>Pod {p.name}</option>)}
          </select>
          <button className="primary" onClick={addEmployee}>Add employee</button>
        </div>
        <div className="grid-wrap tall">
          <table className="st">
            <thead><tr><th>Name</th><th>Pod</th><th>Preferred weekly off</th><th /></tr></thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>
                    <select value={e.podId} onChange={(ev) => change({ employees: employees.map((x) => (x.id === e.id ? { ...x, podId: ev.target.value } : x)) }, `${e.name} moved pod.`)} aria-label={`Pod of ${e.name}`}>
                      {pods.map((p) => <option key={p.id} value={p.id}>Pod {p.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={e.preferredOffDay ?? ''}
                      onChange={(ev) => change({ employees: employees.map((x) => (x.id === e.id ? { ...x, preferredOffDay: ev.target.value === '' ? null : Number(ev.target.value) } : x)) }, `Preference updated for ${e.name}.`)}
                      aria-label={`Preferred off day of ${e.name}`}
                    >
                      <option value="">No preference</option>
                      {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  </td>
                  <td><button onClick={() => removeEmployee(e.id)} aria-label={`Remove ${e.name}`}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Pods and pod leads</h3>
        <div className="row">
          <input placeholder="New pod name" value={podName} onChange={(e) => setPodName(e.target.value)} aria-label="New pod name" />
          <select value={leadChoice} onChange={(e) => setPodLead(e.target.value)} aria-label="Lead of new pod">
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button className="primary" onClick={addPod}>Add pod</button>
        </div>
        <table className="st">
          <thead><tr><th>Pod</th><th>Lead</th><th>People</th><th /></tr></thead>
          <tbody>
            {pods.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <select value={p.leadId} onChange={(ev) => change({ pods: pods.map((x) => (x.id === p.id ? { ...x, leadId: ev.target.value } : x)) }, `New lead for pod ${p.name}.`)} aria-label={`Lead of pod ${p.name}`}>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </td>
                <td>{employees.filter((e) => e.podId === p.id).length}</td>
                <td><button onClick={() => removePod(p.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Brands ({brands.length})</h3>
        <div className="row">
          <input placeholder="New brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} aria-label="New brand name" />
          <button className="primary" onClick={addBrand}>Add brand</button>
        </div>
        <div className="chips">
          {brands.map((b) => (
            <span className="chip" key={b.id}>
              {b.name}
              <button onClick={() => removeBrand(b.id)} aria-label={`Remove brand ${b.name}`}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Processes, calendars and coverage ({processes.length})</h3>
        <p className="mut">Day minimums are optional. Leave a day empty to use the process minimum.</p>
        <div className="row">
          <select value={brandChoice} onChange={(e) => setProcBrand(e.target.value)} aria-label="Brand for new process">
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input placeholder="New process name (CS, ACC...)" value={procName} onChange={(e) => setProcName(e.target.value)} aria-label="New process name" />
          <button className="primary" onClick={addProcess}>Add process</button>
        </div>
        <div className="grid-wrap tall">
          <table className="st">
            <thead><tr><th>Brand and process</th><th>Operating calendar</th><th>Minimum</th><th>Day minimums</th><th>People</th><th /></tr></thead>
            <tbody>
              {processes.map((p) => (
                <tr key={p.id}>
                  <td><b>{brandOf(p.brandId)}</b> {p.name}</td>
                  <td>
                    <select value={p.rule} onChange={(ev) => setProc(p.id, { rule: ev.target.value as Rule }, 'Calendar updated.')} aria-label={`Calendar of ${brandOf(p.brandId)} ${p.name}`}>
                      {(Object.keys(RULE_TEXT) as Rule[]).map((r) => <option key={r} value={r}>{RULE_TEXT[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="num" type="number" min={0} max={9} value={p.minCoverage} onChange={(ev) => setProc(p.id, { minCoverage: Math.max(0, Number(ev.target.value) || 0) }, 'Minimum updated.')} aria-label={`Minimum of ${brandOf(p.brandId)} ${p.name}`} />
                  </td>
                  <td>
                    <div className="days">
                      {DAYS.map((d, i) => (
                        <label key={d}>
                          {d}
                          <input className="num" type="number" min={0} max={9} placeholder={String(p.minCoverage)} value={p.minByWeekday?.[i] ?? ''} onChange={(ev) => setWeekday(p, i, ev.target.value)} aria-label={`${d} minimum of ${brandOf(p.brandId)} ${p.name}`} />
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="chips">
                      {p.employeeIds.map((id) => (
                        <span className="chip" key={id}>
                          {nameOf(id)}
                          <button onClick={() => setProc(p.id, { employeeIds: p.employeeIds.filter((x) => x !== id) }, `${nameOf(id)} removed from ${brandOf(p.brandId)} ${p.name}.`)} aria-label={`Remove ${nameOf(id)} from ${brandOf(p.brandId)} ${p.name}`}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="row">
                      <select value={adding[p.id] ?? ''} onChange={(ev) => setAdding({ ...adding, [p.id]: ev.target.value })} aria-label={`Person to add to ${brandOf(p.brandId)} ${p.name}`}>
                        <option value="">Add person...</option>
                        {employees.filter((e) => !p.employeeIds.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                      <button
                        onClick={() => {
                          const id = adding[p.id]
                          if (!id) return
                          setAdding({ ...adding, [p.id]: '' })
                          setProc(p.id, { employeeIds: [...p.employeeIds, id] }, `${nameOf(id)} assigned to ${brandOf(p.brandId)} ${p.name}.`)
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </td>
                  <td><button onClick={() => change({ processes: processes.filter((x) => x.id !== p.id) }, 'Process removed.')} aria-label={`Remove process ${brandOf(p.brandId)} ${p.name}`}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="two">
        <div className="card">
          <h3>Public holidays</h3>
          <div className="row">
            <input type="date" value={holDate} onChange={(e) => setHolDate(e.target.value)} aria-label="Holiday date" />
            <input placeholder="Holiday name" value={holName} onChange={(e) => setHolName(e.target.value)} aria-label="Holiday name" />
            <button className="primary" onClick={addHoliday}>Add holiday</button>
          </div>
          {holidays.map((h) => (
            <div key={h.date} className="item">
              {h.date}: {h.name}
              <button onClick={() => change({ holidays: holidays.filter((x) => x.date !== h.date) }, 'Holiday removed.')} aria-label={`Remove holiday ${h.name}`}>Remove</button>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Leaves and comp-offs</h3>
          {leaves.length === 0 && <p className="mut">None. Add leaves from the Roster tab.</p>}
          {leaves.map((l, i) => (
            <div key={`${l.employeeId}-${l.date}`} className="item">
              {nameOf(l.employeeId)}, {l.date}, {l.type === 'L' ? 'leave' : 'comp-off'}
              <button onClick={() => change({ leaves: leaves.filter((_, k) => k !== i) }, 'Leave removed. Weekly offs re-planned.')} aria-label={`Remove leave of ${nameOf(l.employeeId)} on ${l.date}`}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}