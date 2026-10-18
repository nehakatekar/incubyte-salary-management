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
| `?search=_` (literal `%` / `_`, escaped match)                      | ~10 ms | Raw `LIKE … ESCAPE` for ids, then the list    |
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

## Client

| Concern           | Approach / measurement                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| Request volume    | Search debounced at 300 ms; filter options cached for 5 min; list cached for 30 s |
| Perceived latency | `keepPreviousData` keeps the current page on screen while the next page loads     |
| Payload           | At most 100 rows per page; salary history only loaded on the detail page          |
| Bundle            | Main ~580 kB / ~179 kB gzip; charts lazy-loaded on first use (`React.lazy`)       |

## Insights API

Measured warm on the 10k data set (9,594 active employees).

| Request                                   | Time   | Notes                                              |
| ----------------------------------------- | ------ | -------------------------------------------------- |
| `GET /api/insights/summary`               | ~80 ms | Converts and ranks every active row for the median |
| `GET /api/insights/by-country`            | ~83 ms | Two grouped passes (local + USD)                   |
| `GET /api/insights/by-department`         | ~79 ms | One grouped pass in USD                            |
| `GET /api/insights/by-job-title`          | ~82 ms | Org-wide, USD                                      |
| `GET /api/insights/by-job-title?country=` | ~26 ms | Narrowed by the `country` index                    |
| `GET /api/insights/distribution`          | ~71 ms | Range query + bucket query                         |
| `GET /api/insights/recent-changes`        | ~15 ms | `effectiveDate` index, limit 10                    |

All within the < 100 ms target, but org-wide views are the heaviest queries in the system because each one scans and sorts all active salaries. **Next step if headcount grows:** cache each aggregate in memory, keyed by view and country, and invalidate on any employee or salary write. Writes are rare compared to reads, so the hit rate would be very high.

Client: the insights page and the employee salary chart are code-split. The main bundle is ~179 kB gzip, and the charting library (~100 kB gzip) loads only when a chart is first shown.

## Deployed (Render free + Turso, both in Oregon)

Measured from India against the live service, median of 5 warm requests. **Total** includes the network round trip to Oregon (~360 ms, the same as `/api/health`, which does no work); **server + database** is what remains once that is subtracted.

| Request                                               | Total   | Server + database |
| ----------------------------------------------------- | ------- | ----------------- |
| `GET /api/health` (network baseline)                  | ~360 ms | –                 |
| `GET /api/employees` (first page)                     | ~385 ms | ~25 ms            |
| `?country=India&department=Engineering&sortBy=salary` | ~360 ms | < 10 ms           |
| `?search=sharma`                                      | ~365 ms | < 10 ms           |
| `GET /api/employees/:id`                              | ~365 ms | < 10 ms           |
| `GET /api/meta/filters`                               | ~385 ms | ~25 ms            |
| `GET /api/insights/summary`                           | ~390 ms | ~25 ms            |
| `GET /api/insights/by-country`                        | ~430 ms | ~70 ms            |

**Found only in production:** `/api/meta/filters` first took **~2.2 s** of server time. Prisma's `findMany({ distinct })` fetches every row and de-duplicates in memory: invisible against a local file, but over the network to Turso it moved 30,000 rows to return ~36 values. Switching to `groupBy` (SQL `GROUP BY`) brought it to ~25 ms.

For users far from Oregon, the round trip dominates. Serving from a region closer to the users, with the database in the same region, is the main lever. The free plan's idle sleep adds about a minute to the first visit after a quiet period.
