import { brands, employees, holidays, pods, processes } from './seedData'

export default function App() {
  const staffed = brands.map((b) => {
    const ids = new Set(processes.filter((p) => p.brandId === b.id).flatMap((p) => p.employeeIds))
    return { ...b, people: ids.size }
  })
  const single = staffed.filter((b) => b.people === 1).length

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16, textAlign: 'left' }}>
      <h1>Roster Desk</h1>
      <p>Seed data loaded. The scheduling engine and roster grid come next.</p>
      <ul>
        <li>{employees.length} employees in {pods.length} pods</li>
        <li>{brands.length} brands, {processes.length} processes, {holidays.length} holidays</li>
        <li>{single} single-resource brands, {brands.length - single} with more than one employee or a backup</li>
      </ul>
      <table>
        <thead><tr><th>Brand</th><th>Processes</th><th>People</th></tr></thead>
        <tbody>
          {staffed.map((b) => (
            <tr key={b.id}>
              <td>{b.name}</td>
              <td>{processes.filter((p) => p.brandId === b.id).map((p) => p.name).join(', ')}</td>
              <td>{b.people}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}