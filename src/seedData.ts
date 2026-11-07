import type { Brand, Employee, Holiday, Leave, Pod, Process, Rule } from './types'

const names = [
  'Aarav Shah', 'Diya Menon', 'Rohan Iyer', 'Sneha Kulkarni', 'Kabir Khan', 'Meera Nair',
  'Vikram Rao', 'Anika Joshi', 'Arjun Patel', 'Pooja Desai', 'Imran Qureshi', 'Tanvi Shetty',
  'Rahul Verma', 'Nisha Pillai', 'Siddharth Jain', 'Kavya Reddy', 'Yash Gupta', 'Ritu Sharma',
  'Dev Malhotra', 'Isha Bhatt', 'Neel Mehta', 'Farah Sheikh', 'Karan Singh', 'Lata Fernandes',
  'Manav Chopra', 'Sana Ali', 'Tejas Pawar', 'Riya Bose', 'Omkar Naik', 'Priya Das',
  'Harsh Vora', 'Zoya Mirza',
]

const brandNames = [
  'Nuvo', 'Petal', 'Haven', 'Strand', 'Mintly', 'Oakwell', 'Brisk', 'Cobalt', 'Dune', 'Ember',
  'Fable', 'Glow', 'Hush', 'Ivy', 'Jolt', 'Kiln', 'Loom', 'Maple', 'Nest', 'Opal',
  'Lumora', 'Verdant', 'Kaffe', 'Zenith',
]

const pad = (n: number) => String(n).padStart(2, '0')
const eid = (i: number) => `e${pad(i + 1)}` // i is 0-based
const bid = (i: number) => `b${pad(i + 1)}`

export const pods: Pod[] = ['Alpha', 'Beta', 'Gamma', 'Delta'].map((name, i) => ({
  id: `pod${i + 1}`,
  name,
  leadId: eid(i), // first four employees are the pod leads
}))

export const employees: Employee[] = names.map((name, i) => ({
  id: eid(i),
  name,
  podId: `pod${(i % 4) + 1}`,
  preferredOffDay: i % 3 === 0 ? 1 + (i % 5) : null,
}))

export const brands: Brand[] = brandNames.map((name, i) => ({ id: bid(i), name }))

export const processes: Process[] = []
const add = (b: number, name: string, rule: Rule, minCoverage: number, emps: number[]) =>
  processes.push({
    id: `p${pad(processes.length + 1)}`,
    brandId: bid(b),
    name,
    rule,
    minCoverage,
    employeeIds: emps.map(eid),
  })

// 20 single-resource brands (about 80%): one employee handles every process.
// Most close on Sundays; two are open every day except public holidays and use
// employee 32 (Zoya) as a shared backup.
for (let i = 0; i < 20; i++) {
  if (i % 10 === 9) {
    add(i, 'CS', 'EXCEPT_HOLIDAYS', 1, [i, 31])
    add(i, 'ACC', 'EXCEPT_HOLIDAYS', 1, [i, 31])
  } else if (i % 2 === 1) {
    add(i, 'CS', 'EXCEPT_SUN_HOLIDAYS', 1, [i])
    add(i, 'NDR', 'EXCEPT_SUN_HOLIDAYS', 1, [i])
  } else {
    add(i, 'CS', 'EXCEPT_SUN_HOLIDAYS', 1, [i])
    add(i, 'ACC', 'EXCEPT_SUN_HOLIDAYS', 1, [i])
  }
}
// 4 multi-employee brands
add(20, 'CS', 'ALWAYS', 2, [20, 21, 22]) // Lumora: 3 people share one 365-day process, 2 needed daily
add(21, 'CS', 'ALWAYS', 1, [23, 24]) // Verdant: shared 365-day CS plus a separate ACC owner
add(21, 'ACC', 'EXCEPT_SUN_HOLIDAYS', 1, [25])
add(22, 'CS', 'ALWAYS', 1, [26, 27]) // Kaffe: shared 365-day CS plus a separate NDR owner
add(22, 'NDR', 'EXCEPT_SUN_HOLIDAYS', 1, [28])
add(23, 'CS', 'EXCEPT_HOLIDAYS', 1, [29, 30]) // Zenith: employee 31 handles retention with employee 30
add(23, 'RET', 'EXCEPT_SUN_HOLIDAYS', 1, [30, 31])

// Sample public holidays for Nov 2026 (dates are editable assumptions)
export const holidays: Holiday[] = [
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-11-11', name: 'Bhai Dooj' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
]

export const leaves: Leave[] = [
  { employeeId: eid(24), date: '2026-11-16', type: 'L' },
  { employeeId: eid(24), date: '2026-11-17', type: 'L' },
  { employeeId: eid(26), date: '2026-11-23', type: 'CO' },
]