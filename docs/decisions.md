# Architecture Decision Records

Short records of decisions that shaped the system: the context, what was decided, and what it costs.

## ADR-001: Prisma 6 on SQLite

- **Context:** The brief suggests SQLite. We want typed queries, migrations and an easy path to Postgres. At the time of writing, npm's `latest` tag for Prisma pointed to an 8.0 release candidate.
- **Decision:** Use **Prisma 6.19** (the latest stable major we know well) with SQLite. Raw SQL (`$queryRaw`) is allowed only inside repositories, for aggregations Prisma cannot express (for example medians).
- **Consequences:** Zero-ops database in a single file. Moving to Postgres is a `provider` change plus a migration. SQLite has a single writer, which is fine for an HR team and noted as a scale limit.

## ADR-002: Salaries as whole-unit integers

- **Context:** The first design stored money in minor units (cents or paise). Prisma's `Int` is 32-bit (max ≈ 2.1 billion), so a salary in paise would overflow above ₹21M (~$250k). A senior Indian executive could realistically exceed that.
- **Decision:** Store the **annual salary as an integer in whole currency units** plus an ISO 4217 currency code. Annual salaries are agreed in round numbers, so cents carry no information here.
- **Consequences:** No floating-point error and no overflow risk (the limit is 2.1 billion of any currency). If sub-unit amounts are ever needed (for example hourly rates), revisit with `BigInt` or `Decimal`.

## ADR-003: Current salary on the employee row, plus append-only revisions

- **Context:** List views and every aggregation need the current salary. History is only needed on the detail page and for "recent changes".
- **Decision:** `Employee.salary` holds the current value. `SalaryRevision` is append-only and written in the **same transaction** as any salary change. The seed generates an initial revision for every employee and 0–2 raises.
- **Consequences:** Hot reads need no join. The cost is a small amount of denormalisation, kept consistent by a single service method and covered by tests.

## ADR-004: Deterministic, realistic seed data

- **Context:** The data needs to be big enough to prove behaviour at 10k scale and realistic enough to make the insights meaningful. Tests need stable data.
- **Decision:** A pure `generateEmployees({ count, seed, referenceDate })` function. It weights the country and department mix, gives senior titles higher US base pay, applies a per-country pay factor and converts to local currency at static FX rates, and uses locale-specific names. It never reads the real clock. The seed script re-creates the data in one transaction.
- **Consequences:** The same data on every machine and in every run. Seeding 10k employees and ~16k revisions takes about 2 s.
