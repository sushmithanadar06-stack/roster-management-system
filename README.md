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

### 1. How did I model employees, brands, processes, pods and their relationships?
Pods hold employees, and each pod has a lead (an employee). Brands hold processes (CS, ACC, NDR, RET). Employees and processes are linked many-to-many: each process has a list of employee ids, so one person can work on several processes or brands (for example, one backup employee is shared by two brands). The rules belong to the process, not the brand: its operating calendar (365 days, every day except public holidays, or closed on Sundays and public holidays) and its minimum coverage. This is because two processes in the same brand can follow different rules. The process calendar is kept separate from each employee's own daily status (Working, Weekly off, Public holiday, Leave, Comp-off).

### 2. How does the system generate a roster and check the constraints?
The generator works in stages.
1. If none of an employee's processes is open on a day, that day is a day off by itself (a weekly off on a Sunday, or a public holiday).
2. Approved leaves and comp-offs are placed.
3. Each employee gets one weekly off in every week of four days or more. For each day of the week the engine gives a score and picks the lowest. A day gets +1000 if taking it would leave one of the employee's processes below its minimum, +2 for each person already off that day (to spread offs out), +300 if it would cause 7 or more working days in a row, and -8 if it is the employee's preferred day.

The validator then checks every process on every day it is open. It counts the people working (plus any manager-assigned covers) and compares that with the minimum. I wrote 13 automated tests for the calendar rules, the generator, the validator and the change handling.

### 3. How are single-resource brands and multi-employee brands handled?
Both use the same model: a brand's staffing is the set of employees on its processes. A single-resource brand has no spare capacity, so any weekly off or leave on a day it is open creates a coverage gap. The generator avoids this where it can, by putting the weekly off on a day the brand is closed (for example, Sunday). Brands with two or three employees spread their weekly offs across different days so the minimum still holds. For example, one brand needs 2 of its 3 people working every day, and the generator staggers their offs to make that possible.

### 4. What happens when an employee who manages all processes for a brand is unavailable on a required day?
The validator raises one error per process and day, for example: "No one available: Haven CS. Tue 17 Nov: 0 working, 1 required. Assigned: Rohan (L)". The roster cannot be published while errors remain. For each gap the system suggests up to three backups: people who are working that day, who are not already covering a different brand, and whose own processes would still meet their minimum without them. It ranks people with the same process, the same pod, or those already covering that brand that day first. It can also suggest asking an assigned person to work their weekly off and owing them a comp-off. The manager clicks a suggestion to apply it, and the error clears. If no safe backup exists, the issue says so and is left for a manager decision.

### 5. How does the system handle conflicting requirements or insufficient staffing?
Rules have two levels. Client coverage is mandatory and shows as an error. Preferences and wellbeing rules (the preferred weekly-off day, and more than 6 working days in a row) show as warnings. Coverage always wins over preference. The generator never silently breaks coverage: it penalises such days heavily, and if no safe day exists, the validator flags the resulting gap. Nothing is hidden, and publishing is blocked until the errors are resolved.

### 6. Which parts did I automate, and which are left under human control?
Automated: applying the operating calendars, placing weekly offs, checking coverage on every process and day, and suggesting backups. Human: entering and approving leaves, accepting or rejecting a backup, manual edits to any cell, and publishing. The tool never changes the roster on its own to fix a gap. Rosters affect people's days off and client commitments, so the manager should make the final decision.

### 7. If the company doubled its team and brand count, what would I change?
I would move the data from a seed file to a database behind an API, add logins and roles for managers and pod leads, and keep an audit log of changes. I would precompute lookups (employee to processes, process to employees) so the engine scales, and virtualise the roster grid so large tables stay fast. If the greedy weekly-off placement starts to get stuck, I would replace it with a constraint solver such as OR-Tools, using the same rules as constraints.

### 8. If I had one more week, what would I improve first?
First, move the data from the browser to a real database with logins, so several managers can work on the same roster. Second, fairer sharing of weekly offs over several months, and regeneration that moves as few existing offs as possible after a change. After that: CSV export, an approval flow for pod leads, notifications when a published roster changes, and a constraint solver for very large teams.

## Setup tab
Managers can add, edit and remove employees, pods and pod leads, brands, processes (operating calendar, minimum staff, optional minimum for a specific weekday, assigned people), public holidays, and leaves and comp-offs, all in the browser. The roster is re-planned after every change. No code changes are needed. Everything is saved in the browser (local storage), so a refresh keeps the data. "Reset to sample data" restores the 32-employee sample.

## Tests
`npm test` runs 13 automated tests for the calendar rules, roster generation, conflict detection, backup suggestions and weekday minimums.

## Current limitations
- Data is saved in the browser only (no shared database, no logins).
- Full-day shifts only, with no shift timings.
- Sample public holidays cover November 2026 only. Other months have none until added in Setup.
- The weekly-off placement is a greedy scoring method, not a full optimiser. It always reports a gap instead of hiding it.