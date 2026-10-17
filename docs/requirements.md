# Requirements — ACME Salary Management

## Goal

Replace the spreadsheets ACME's HR team uses to manage salary data for **~10,000 employees across multiple countries** with a web application that lets the **HR Manager**:

1. Keep employee and salary records accurate and up to date in one place.
2. Answer questions about **how the organisation pays people**, for example "What is the median salary for a Software Engineer in India?" or "Which department costs the most?".

## Persona

**HR Manager.** Comfortable with Excel and not technical. Needs speed and correct numbers, and needs to trust the data. Makes a few salary changes at a time and wants answers in seconds, without building pivot tables.

## Scope & Features

| #   | Feature                                                                                                                                                                                      | Why it matters                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **Employee directory** with server-side pagination, search (name / email / employee code), filters (country, department, job title, status) and sorting                                      | Finding one person among 10k rows is the most frequent task. Server-side keeps it fast at scale.                      |
| 2   | **Employee CRUD**: add, view, edit, terminate (soft delete)                                                                                                                                  | Core data management that replaces editing spreadsheet rows. Terminated employees are kept for history and reporting. |
| 3   | **Salary update with reason** that records an **append-only revision history**, shown on the employee page                                                                                   | Spreadsheets lose the "why" and the "before". History gives an audit trail at very low cost.                          |
| 4   | **Pay insights dashboard**: headcount and total pay cost by country and department; min / max / average / median salary by country and job title; salary distribution; recent salary changes | This is the "understand how the org pays people" requirement. Median is included because averages hide skew.          |
| 5   | **Multi-currency**: each salary is stored in its local currency. Cross-country views are converted to **USD** using a fixed, documented rate table.                                          | Salaries really are paid in local currencies, but comparison needs a common unit.                                     |
| 6   | **Seed script** generating 10,000 realistic, deterministic employees (~8 countries, ~7 departments, ~20 job titles, plausible pay bands)                                                     | Demonstrates and tests behaviour at the target scale, and gives the same result on every run.                         |
| 7   | **Deployed app plus demo video**                                                                                                                                                             | Required by the brief.                                                                                                |

### Business rules

- Salary means **annual gross base salary**. It is stored as an integer in minor units (for example cents) together with an ISO currency code. Floats are never used for money.
- A salary amount must be greater than 0. A salary change needs an effective date and a reason.
- Each salary change writes one `SalaryRevision` row (old amount → new amount) **in the same transaction** as the update.
- Employee code and email are unique.
- Analytics include **active** employees only, unless a filter says otherwise.

## Deliberately Out of Scope

| Left out                                        | Reasoning                                                                                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Payroll: net pay, tax, deductions, payslips     | Confirmed by ACME as not expected. It is a separate, country-specific product, and building it badly would be worse than not building it. |
| Monthly salary records                          | Confirmed by ACME as payroll territory. Revision history covers "how did pay change".                                                     |
| Authentication & roles                          | A single HR persona is in scope. This is the **first follow-up before production**, because salary data is sensitive.                     |
| Live FX rates                                   | A static table keeps analytics deterministic and testable. A rate provider can replace it later behind the same interface.                |
| Excel/CSV bulk import & export                  | High value for migrating off spreadsheets, but it needs careful validation and conflict handling. It is the first **feature** follow-up.  |
| Bonuses, equity, allowances, approval workflows | They broaden the data model without serving the core question. They can be added as extra compensation components later.                  |
| Org hierarchy / manager relationships           | Not needed to answer pay questions in this iteration.                                                                                     |

## Success Criteria

- Search, filter or paginate across 10k employees responds in **< 200 ms** (target < 100 ms for the API).
- The HR manager can find an employee, change their salary and see the change reflected in insights in under a minute.
- Core logic (salary changes, statistics, filtering) is covered by fast, deterministic automated tests.
