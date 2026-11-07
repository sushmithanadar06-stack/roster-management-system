# Roster Desk: Smart Roster Management System

A browser-based tool that helps an operations manager plan, generate, validate and change monthly rosters across brands, processes and pods.

- Live app: https://roster-management-system-one.vercel.app
- Code: https://github.com/sushmithanadar06-stack/roster-management-system

## Tech stack
React, TypeScript and Vite, hosted on Vercel. The scheduling logic lives in plain TypeScript functions (no UI code), so it can be tested on its own. No backend or environment variables are needed, so there is no `.env` file to set up.

## Run it locally
1. Install Node.js (LTS) and Git.
2. `git clone https://github.com/sushmithanadar06-stack/roster-management-system.git`
3. `cd roster-management-system`
4. `npm install`
5. `npm run dev` and open the address it prints (usually http://localhost:5173).

## Sample data
32 employees in 4 pods (each with a pod lead), 24 brands, 47 processes, 3 public holidays and 3 sample leaves for November 2026.
- 18 brands have one dedicated employee for every process.
- 2 more brands have one main employee plus a shared backup.
- 4 brands have two or three employees, with a mix of separate processes and shared ones. For example, Lumora has three people sharing one 365-day process that needs two working every day.

## Data model
- Pod: a name and a lead (an employee).
- Employee: belongs to one pod, with an optional preferred weekly-off day.
- Brand: a client.
- Process: belongs to one brand (CS, ACC, NDR, RET). It has an operating calendar rule, a minimum coverage number and a list of assigned employees. Employees and processes are many-to-many.
- Leave: an employee, a date, and whether it is a leave or a comp-off.
- Holiday: a date and a name.
- Operating calendar rules: 365 days; every day except public holidays; closed on Sundays and public holidays.

A process's operating calendar is separate from an employee's own schedule. A process can need coverage on a day when one of its employees is off.

## Assumptions
- Full-day shifts only (no shift timings).
- One weekly off per employee per week. A Sunday counts as the weekly off where all of the employee's processes are closed.
- Public holidays apply through each process's own calendar rule.
- Coverage requirements are mandatory. Preferred weekly-off days are warnings only.
- More than 6 working days in a row is a warning.
- Holiday dates are sample values and can be edited.

## How I think

1. How did I model employees, brands, processes, pods and their relationships?
   Pods hold employees. Brands hold processes. Employees and processes are linked many-to-many through each process's list of employee ids, so one person can handle several processes or brands. Rules (calendar and minimum coverage) belong to the process, not the brand, because processes within the same brand can differ.

2. How does the system generate a roster and check the constraints?
   (to be filled after the engine is built)

3. How are single-resource brands and multi-employee brands handled?
   Both use the same model. A brand's staffing is just the set of employees across its processes. A single-resource brand has no spare capacity, so a weekly off or leave on an operating day creates a coverage gap. The system closes this by choosing the weekly off on a day the brand is closed (for example Sunday) where it can, and otherwise flagging the gap and suggesting a backup. Multi-employee brands can spread weekly offs so that the minimum is still met.

4. What happens when an employee who manages all processes for a brand is unavailable on a required day?
   (to be filled after the change handling is built)

5. How does the system handle conflicting requirements or insufficient staffing?
   (to be filled)

6. What did I automate, and what stays under human control?
   (to be filled)

7. What would change if the company doubled its team and brand count?
   (to be filled)

8. What would I improve first with one more week?
   (to be filled)