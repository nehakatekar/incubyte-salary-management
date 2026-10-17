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
