# AI Usage Log

This project was built with **Claude Code** (an agentic CLI) as a pair programmer. This log records *how* AI was used, what was accepted, what was changed, and how correctness was verified. It is updated as work progresses, not written after the fact.

## Principles

1. **Think before generating.** Requirements and architecture were written and reviewed first. Later prompts reference these docs rather than ad-hoc descriptions.
2. **Tests first for core logic.** AI drafts the tests, I review them against the requirements, and only then is the implementation generated.
3. **Every diff is reviewed before commit.** Nothing is committed unread. Commits stay small so each one can be reviewed.
4. **AI suggests, I decide.** Architectural choices and scope cuts are mine. Where AI output was wrong or over-engineered, it is noted below.

## Workflow

| Step | AI role | My role |
|---|---|---|
| Read the brief and clarification email | Summarise the constraints and propose an approach | Validate against the email answers and choose the scope |
| Requirements / architecture docs | Draft | Edit, cut scope, own the trade-offs |
| Tests | Draft cases from the requirements | Check the cases are meaningful and the expected values are hand-verified |
| Implementation | Generate code to make the tests pass | Review for readability, layering and edge cases |
| Verification | Run tests, lint and typecheck | Manually exercise the UI and check query performance |

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
