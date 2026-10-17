# Performance Notes

Measured locally (Windows 11, Node 22, SQLite) against the seeded data set of **10,000 employees and 16,080 salary revisions**. Times are end-to-end HTTP round trips with `curl`, warm.

## Seeding

| Operation                                                                         | Time     |
| --------------------------------------------------------------------------------- | -------- |
| Generate + insert 10k employees, 16k revisions (one transaction, 500-row batches) | ~2–3.5 s |

## Employee list API

| Request                                                             | Time   | Query plan                                    |
| ------------------------------------------------------------------- | ------ | --------------------------------------------- |
| `GET /api/employees` (first page, default sort)                     | ~9 ms  | Index scan on `fullName`                      |
| `?page=200&pageSize=50` (deep page)                                 | ~25 ms | Offset skips 9,950 rows                       |
| `?country=India&department=Engineering&status=ACTIVE&sortBy=salary` | ~13 ms | `Employee_country_department_idx` + temp sort |
| `?search=sharma` (substring on name/email/code)                     | ~22 ms | Full scan (leading wildcard)                  |
| `GET /api/employees/:id` (with revisions)                           | ~27 ms | Primary key + `employeeId` index              |
| `GET /api/meta/filters`                                             | ~50 ms | 3 × `DISTINCT` on indexed columns             |

All are well inside the < 100 ms API target in `requirements.md`. The first request after startup is slower (~100 ms) while the connection and query engine warm up.

## Design choices that keep it fast

- Filtering, sorting and paging happen in SQL, never in JS. Responses carry at most 100 rows.
- The current salary is stored on `Employee`, so list and aggregate queries need no join (ADR-003).
- Indexes on every filter column, plus a composite `(country, department)` index for the most common combined filter.
- `sortBy` is whitelisted to known columns.

## Scale-up path (if headcount grows 10–100×)

| Pressure                    | Next step                                                          |
| --------------------------- | ------------------------------------------------------------------ |
| Substring search slows down | SQLite FTS5 (or Postgres `pg_trgm`) index on name/email/code       |
| Deep offset pages slow down | Keyset (cursor) pagination on `(sortKey, id)`                      |
| `meta/filters` called often | Cache in memory and invalidate on employee writes                  |
| Concurrent writers          | Move to Postgres: change the Prisma `provider` and run a migration |
