# AI Usage Log

This project was built with **Claude Code** (an agentic CLI) as a pair programmer. This log records _how_ AI was used, what was accepted, what was changed, and how correctness was verified. It is updated as work progresses, not written after the fact.

## Principles

1. **Think before generating.** Requirements and architecture were written and reviewed first. Later prompts reference these docs rather than ad-hoc descriptions.
2. **Tests first for core logic.** AI drafts the tests, I review them against the requirements, and only then is the implementation generated.
3. **Every diff is reviewed before commit.** Nothing is committed unread. Commits stay small so each one can be reviewed.
4. **AI suggests, I decide.** Architectural choices and scope cuts are mine. Where AI output was wrong or over-engineered, it is noted below.

## Workflow

| Step                                   | AI role                                           | My role                                                                  |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Read the brief and clarification email | Summarise the constraints and propose an approach | Validate against the email answers and choose the scope                  |
| Requirements / architecture docs       | Draft                                             | Edit, cut scope, own the trade-offs                                      |
| Tests                                  | Draft cases from the requirements                 | Check the cases are meaningful and the expected values are hand-verified |
| Implementation                         | Generate code to make the tests pass              | Review for readability, layering and edge cases                          |
| Verification                           | Run tests, lint and typecheck                     | Manually exercise the UI and check query performance                     |

## Log

### Phase 0 — Planning & docs

- **Prompt (summary):** "Read the assessment brief and the clarification email carefully. Propose a complete approach and an incremental commit structure. Don't write code yet."
- **Outcome:** Stack (Node/Express/Prisma/SQLite, React/Vite/MUI), domain model, scope and a ~30-commit plan.
- **Decisions I made / adjusted:**
  - Chose **revision history** over current-salary-only. The email allowed either, and history enables "recent changes" insights and an audit trail.
  - Kept **payroll and net pay out of scope**, as the email confirmed.
  - Stored the current salary on the employee row (denormalised) for fast list and aggregate queries, in addition to the revision table.
- **Verification:** Docs reviewed against the brief's checklist (goal, scope, out-of-scope with reasons).

<!-- Subsequent phases appended below -->

### Phase 1 — Scaffolding

- **Prompt (summary):** "Set up npm workspaces (server + client), TypeScript, ESLint, Prettier, an Express app with a health endpoint, a Vite React + MUI client, and CI. Verify everything before committing."
- **Outcome:** Workspaces, shared strict `tsconfig.base.json`, flat ESLint config, Express `createApp()` factory (no `listen`, so Supertest can drive it), MUI shell, GitHub Actions pipeline (lint → format → typecheck → test → build).
- **Corrected along the way:**
  - Installing "latest" pulled **TypeScript 7**, which `typescript-eslint` does not support yet (peer range `<6.1`). Pinned TypeScript to `~5.9` across workspaces instead of forcing the install with `--legacy-peer-deps`.
  - The first root `dev` script used `&` to run server and client together, which does not run in parallel on Windows. Replaced it with `concurrently`.
- **Verification:** `npm run lint`, `format:check`, `typecheck`, `test` (server + client) and `build` all pass. The built server answered `GET /api/health` with `{"status":"ok"}`.

### Phase 2 — Data layer & seed

- **Prompt (summary):** "Add the Prisma schema with indexes, then write tests for a deterministic 10k-employee generator **before** implementing it, then the seed script."
- **Outcome:** Schema and initial migration, `generateEmployees()` (pure and seeded, with locale-specific names, weighted country/department mix and per-country pay factors), and a seed script that loads 10k employees and ~16k revisions in ~2 s.
- **Corrected along the way:**
  - npm's `latest` for Prisma was an **8.0 release candidate**. Pinned to stable 6.19 instead of building on a pre-release (ADR-001).
  - **Money in minor units would overflow** Prisma's 32-bit `Int` for senior INR salaries (₹21M+ in paise). Switched to whole currency units and updated the docs (ADR-002). This was caught while writing the schema, before any data depended on it.
  - A throwaway verification command hung because of a stray `cat` waiting on stdin. It was stopped and re-run. This was a tooling slip, not a code issue.
- **Verification:** 15 generator tests (determinism, uniqueness, currency per country, seniority pay ordering, revision chain integrity) were seen failing first, then passing. The seed was run twice to confirm it is re-runnable. Distributions were checked with SQL (headcount per country, pay by title, ~4% terminated).

### Phase 3 — Employee API

- **Prompt (summary):** "Write API specs first for list (pagination, search, filters, sorting), get, create, update, terminate, filter metadata and error handling, using a real temporary SQLite database. Then implement it in layers: routes → service → repository."
- **Outcome:** 43 new specs, seen failing, then passing. Zod validation, a central error handler with one error shape, a repository as the only Prisma boundary, and DTOs that format calendar dates as `YYYY-MM-DD`.
- **Decisions I made / adjusted:**
  - `PATCH` uses a **strict schema** that cannot touch salary, country or status (ADR-006). Otherwise the salary audit trail could be bypassed.
  - Integration tests apply the migration SQL directly to a temp file instead of running `prisma migrate`. Each file gets a fresh DB in milliseconds, and the suite runs in ~2 s.
- **Corrected along the way:**
  - The architecture doc claimed search would use indexes. Measuring showed that a `%term%` search is a full scan (~20 ms at 10k). I corrected the doc and recorded the trade-off and upgrade path (ADR-005, `performance.md`).
  - A generic `distinct(field)` helper needed an unsafe cast that the type checker rejected. Replaced it with three explicit, fully typed queries.
  - A heredoc used to write a test file was cut off part-way. It was caught on review and the missing tests were restored before running the suite.
- **Verification:** 61 server tests pass in ~2.3 s. Endpoints were timed against the 10k seeded DB (all < 50 ms warm), query plans checked with `EXPLAIN QUERY PLAN`, and the data was re-seeded afterwards to remove the manual test hire.

### Phase 4 — Salary changes & history

- **Prompt (summary):** "Write the salary-change specs first: service unit tests with a fake repository and a fixed clock, plus API and repository integration tests. Then implement it with a transaction and optimistic concurrency."
- **Outcome:** `SalaryService` with four business rules, `recordSalaryChange` (a conditional update plus a revision in one transaction), a `BusinessRuleError` returning 422, and an injected `Clock`. 22 new tests, seen failing first.
- **How I checked the tests were meaningful:** I ran a quick **mutation check**. I disabled each rule in turn (future date, terminated, optimistic check, revision insert) and confirmed at least one test failed every time, then restored the code.
- **Product gap found by manual testing:** the API accepted an 18× raise (£55,400 → £999,999). I decided not to block it server-side, because legitimate large changes exist, and planned a UI confirmation for changes over ±30% instead (ADR-007).
- **Verification:** 83 server tests pass in ~2.8 s. Lint, typecheck and format are clean. A manual change against the 10k DB returned 201 in ~55 ms. The data was re-seeded afterwards.

### Phase 6 — UI (built before insights, by choice)

- **Why the reorder:** I chose to build the UI before the insights API, so the core HR workflows (find, view, edit, change salary) could be exercised end to end sooner. The Insights page is a placeholder until Phase 5.
- **Prompt (summary):** "Build the React UI: employee list with server-side paging/search/filters/sort kept in the URL, a detail page with salary history, and create/edit/change-salary/terminate dialogs. Mirror the server's validation, require confirmation for salary changes over ±30%, and write component tests with a mocked fetch."
- **Outcome:** API layer with typed errors, React Query hooks with cache invalidation, list/detail pages, four dialogs, and 17 component and unit tests.
- **Corrected along the way:**
  - npm's `latest` for React Router was a new **8.0 major**, so I pinned 7.x. MUI X DataGrid **does not support MUI 9**, so I used a plain MUI table instead (ADR-008).
  - The "add employee" form needed every supported country, but `/meta/filters` only returned countries that already had staff. I added `supportedCountries` to the endpoint, test first.
  - Two attempts to write files via shell heredocs failed on quoting. I switched to writing files directly. Nothing broken was committed.
- **How I checked the tests were meaningful:** all 17 passed on the first run, which deserves suspicion, so I mutation-checked them. Removing the ±30% guard, the future-date check, the search debounce, or the page-1 reset each made a test fail.
- **Visual verification:** I ran the built UI against the 10k database and screenshotted the list, a filtered and sorted view, and an employee page with headless Edge to confirm layout, currency formatting and history rendering.

### Phase 5 — Pay insights

- **Prompt (summary):** "Build insights answering 'how does the org pay people': summary, by country, by department, by job title (optionally per country), salary distribution and recent changes. Do all aggregation in SQL, write tests first against a hand-computed dataset, then build the dashboard following the data-viz skill."
- **Outcome:** `InsightsRepository` (one SQL query per view: a rates CTE, converted amounts, window-function medians), `InsightsService` (merging, rounding, sorting, histogram), six endpoints, and a dashboard with KPI tiles, a department cost chart, country and job-title tables with range bars, a histogram with a table view, and recent changes.
- **How the numbers were verified:**
  - The API tests use a **7-person dataset where every expected value was worked out by hand**, with the arithmetic written in comments. They were seen failing first, and matched exactly once implemented.
  - The **SQL was mutation-checked**: breaking the even-count median, dropping the active-only filter, skipping FX conversion, or ranking unsorted values each failed 4–6 tests.
  - Histogram bucket widths and FX conversion have their own unit tests.
- **Rendered and reviewed, then corrected:** the first screenshot of the dashboard showed three problems that no test would catch: a cramped country table (names wrapping onto three lines), awkward axis ticks ($95M, $190M…), and stretched half-empty cards. I fixed the layout: the country table went full width, the redundant axis was removed because every bar is labelled, cards size to their content, and recent changes were compacted to four columns. I re-screenshotted to confirm.
- **Corrected along the way:**
  - Recharts pushed the bundle past 1 MB. I lazy-loaded the insights route, so employee screens stay at ~208 kB gzip.
  - jsdom has no `ResizeObserver`, which Recharts needs, so I added a minimal stub in the test setup.
- **Verification:** 107 server and 23 client tests pass. Lint, typecheck and build are clean. Endpoints were timed on 10k rows (15–85 ms).
