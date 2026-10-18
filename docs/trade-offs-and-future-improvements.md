# Trade-offs and Future Improvements

What this version deliberately gives up, the limits we know about, and what we would do next, in priority order. The full reasoning behind each decision is in [`decisions.md`](decisions.md) (ADR-001 to ADR-010).

## Key trade-offs

| Decision                                                                     | What it gives us                                                          | What it costs                                                                     | Revisit when                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **SQLite via Prisma** (ADR-001)                                              | Zero-ops, single-file database; typed queries; migrations                 | One writer at a time; no native median or case-insensitive Unicode search         | Several HR users write at once, or data grows past ~100k employees    |
| **Salaries as whole-unit integers** (ADR-002)                                | No float errors, and no 32-bit overflow for large INR salaries in paise   | Cannot store fractional amounts such as hourly rates                              | Hourly or part-unit pay is needed: use `Decimal` or `BigInt` cents    |
| **Current salary on the employee row, plus append-only revisions** (ADR-003) | Lists and aggregates need no join; full audit trail of every change       | A little denormalisation, kept consistent by one transactional repository method  | Never, for this domain; it is the standard pattern                    |
| **Offset pagination** (ADR-005)                                              | "Jump to page N", simple URLs, 9–25 ms at 10k rows                        | Deep pages slow down linearly with the offset                                     | Headcount reaches hundreds of thousands: move to keyset pagination    |
| **Substring `LIKE` search** (ADR-005)                                        | Finds partial names, emails and codes with no extra infrastructure        | Full table scan (~22 ms at 10k); ASCII-only case folding ("Ö" does not match "ö") | Search slows, or non-Latin names matter: SQLite FTS5 or Postgres      |
| **Static FX rates** (ADR-009)                                                | Deterministic, testable cross-country comparisons in USD                  | Rates do not follow the market; historic comparisons use today's rates            | Finance needs real reporting: rates versioned by date                 |
| **Salary, country and status each have their own workflow** (ADR-006, 007)   | The salary audit trail cannot be bypassed by a general edit               | Relocating someone to another country is not supported yet                        | HR needs relocations: add a dedicated relocation flow                 |
| **No future-dated salary changes** (ADR-007)                                 | No pending state or scheduler to build and test                           | A raise agreed today for next month must be entered on the day                    | HR plans raises ahead: add scheduled changes with a daily job         |
| **Large changes (> ±30%) need confirmation, not a hard limit** (ADR-007)     | Legitimate large changes still work; typos are caught by a live preview   | A determined user can still save a wrong number                                   | Approval workflow is introduced (see below)                           |
| **Plain MUI table rather than a data-grid library** (ADR-008)                | No extra dependency; paging, sorting and filtering are server-side anyway | No column resizing, reordering or virtualised scrolling                           | HR wants spreadsheet-style column control                             |
| **Hand-written client types mirroring server DTOs** (ADR-008)                | No code generation step                                                   | Types can drift if one side changes                                               | The API grows: generate types from an OpenAPI spec or share a package |

## Known limitations

- **No authentication or authorisation.** Anyone who can reach the app can read and change salaries. This is the first thing to fix before real use.
- **No record of who made a change.** Revisions record what, when and why, but not by whom, because there are no users yet.
- **Single SQLite file.** Backups rely on the host's volume snapshots. Concurrent writes are serialised; the optimistic check turns conflicts into a clear 409 rather than lost updates.
- **Insights are computed on every request.** Org-wide views take ~80 ms at 10k employees, because each one scans and sorts all active salaries.
- **Search case-folding is ASCII-only**, a SQLite `LIKE` limitation.
- **Component tests run in jsdom**, so real-browser behaviour (layout, focus, charts) was checked manually with Playwright screenshots rather than by automated end-to-end tests.

## Future improvements, in priority order

1. **Authentication and role-based access.** Sign-in (SSO via the company identity provider), with roles such as HR admin (edit), HR viewer (read) and manager (read own team). Salary data is the most sensitive data a company holds.
2. **Audit log with the actor.** Record who made every change, and show a per-employee activity feed. This depends on 1.
3. **Excel / CSV import and export.** The team works in spreadsheets today: a validated bulk import (with a dry-run report of errors) is the fastest way to migrate, and export keeps them comfortable during the switch.
4. **Approval workflow for salary changes.** A change above a threshold goes to a second approver before it takes effect, replacing the current confirmation checkbox.
5. **Scheduled salary changes and relocations.** Future-dated raises applied by a daily job, and a relocation flow that changes country and currency with a recorded conversion.
6. **FX rates versioned by date.** Store rates per day so historic comparisons use the rate that applied at the time.
7. **Insights caching.** Cache each aggregate in memory, keyed by view and country, and invalidate on any employee or salary write. Writes are rare compared to reads.
8. **Scale-up path for the data layer.** Postgres (a Prisma `provider` change plus a migration), keyset pagination for deep pages, and full-text search (`pg_trgm` or FTS5) with Unicode case folding.
9. **Pay-equity analysis.** Compare pay for the same title and country across tenure and other dimensions, and flag outliers outside a band.
10. **Engineering hardening.** End-to-end tests in a real browser (Playwright) for the main HR journeys, generated API types from an OpenAPI spec, structured logging with request ids, and an accessibility audit with a screen reader.
