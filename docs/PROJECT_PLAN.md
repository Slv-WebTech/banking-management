# Project Plan

## Completed
- **Backend scaffold**: Express app, MongoDB models (`User`, `Account`, `Transaction`), JWT+RBAC middleware, centralized error handling, rate limiting, input validation, security headers.
  - Acceptance criteria: all backend modules `require()` cleanly, all files pass `node --check`. **Met.**
- **Frontend scaffold**: Vite React app, routing, `AuthContext`, Axios client, three role-based dashboards, transfer form, transaction table with filters/pagination.
  - Acceptance criteria: `vite build` succeeds with no errors. **Met.**
- **Dependency install**: both `client/` and `server/` install cleanly.
  - Acceptance criteria: `npm install` exits 0 in both. **Met** (client has 4 npm audit findings — tracked in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md), not blocking).
- **Documentation baseline**: this `/docs` set.
  - Acceptance criteria: accurately reflects code as of this session, no fabricated "done" claims. **Met.**
- **First live end-to-end run against real MongoDB** (2026-08-14).
  - Acceptance criteria: register → login → open account → transfer → view history succeeds via both direct API calls and the real browser UI, for all three roles. **Met** — full results in [TESTING.md](TESTING.md). Also surfaced one real gap (no funding/deposit mechanism), resolved below.
- **Admin bootstrap script** (2026-08-14): `server/scripts/seedAdmin.js` (`npm run seed:admin -- <email>`).
  - Acceptance criteria: promotes an existing registered user to `admin` without manual DB editing. **Met** and used to create the first real admin during testing.
- **Self-service account deposit** (2026-08-16): `POST /api/transactions/deposit`, `DepositForm.jsx`, following the exact same atomic-update + idempotency + ledger pattern as transfers.
  - Acceptance criteria: a new customer can fund their own account and then use the transfer feature, end-to-end, without any manual database intervention. **Met** — verified live via API and browser, see [TESTING.md](TESTING.md). Also fixed a real bug found in the process: `TransactionTable.jsx` mislabeled deposit transactions as "Debit."
- **`git init` + first commit + push** (2026-08-17): repo created at `github.com/Slv-WebTech/banking-management` (private), pushed via the personal SSH identity (`github-personal` host alias). Commit author/committer identity corrected the same day per explicit request (was the machine's generic git identity + a Claude co-author trailer; now `Slv-WebTech`, no AI-assistance trailer) — required an amend + confirmed force-push since it was already on the remote.
  - Acceptance criteria: current working state has version history and a remote backup, with correct attribution. **Met.**
- **Automated test suite** (2026-08-17, user's explicit choice over other "Next" items): Jest + Supertest + `mongodb-memory-server` for `server/` (32 tests), Vitest + React Testing Library for `client/` (21 tests). Covers the critical-flow priority list [TESTING.md](TESTING.md) laid out after the two manual verification sessions, plus a dedicated regression test for the `TransactionTable` bug found on 2026-08-16.
  - Acceptance criteria: `npm test` passes in both `client/` and `server/`; the highest-risk logic (money movement, auth/authorization, the specific bug class already found once) has real regression protection. **Met** — see [TESTING.md](TESTING.md) for exactly what's covered and what isn't yet.
- **Premium UI/UX redesign** (2026-08-22): full design-system rebuild across every screen — see [CHANGELOG.md](CHANGELOG.md) for the breakdown.
  - Acceptance criteria: `vite build` succeeds, all pre-existing client tests still pass unmodified (except where a new feature intentionally changed asserted text, e.g. the search placeholder). **Met.**
- **CI pipeline** (2026-08-22): `.github/workflows/ci.yml` runs both test suites + the client build on push/PR to `main`.
  - Acceptance criteria: workflow file present and syntactically valid. **Met** for the file itself; **not yet verified** by an actual GitHub Actions run.
- **Staff account-closure approval** (2026-08-22): `POST /api/accounts/:id/approve-closure`, `.../reject-closure`, plus an EmployeeDashboard "Pending Closures" queue.
  - Acceptance criteria: staff can finalize a `PendingClosure` account to `Closed` or revert it to `Active` through the UI, with tests covering ownership and the not-pending case. **Met.**
- **Human-searchable transaction search** (2026-08-22): `search` now matches free-text `description` or a counterparty's account number, not just the internal `reference`.
  - Acceptance criteria: covered by tests confirming the broader match and confirming search still can't leak another customer's transactions. **Met.** UI placeholder text updated to reflect it.
- **Loan management module** (2026-08-22): apply → staff approve (sets rate, disburses, generates schedule) / reject → customer repays EMIs → auto-closes when fully paid. New `Loan` model, `loanSchedule.js` amortization math, full controller/routes, `/loans` customer page, staff review queue in `EmployeeDashboard.jsx`.
  - Acceptance criteria: EMI/amortization math independently unit-tested (13 tests, including hand-derived exact values) before anything else depended on it, given [FUTURE_FEATURES.md](FUTURE_FEATURES.md) flagged this as needing careful testing; full apply/approve/reject/repay flow covered by 14 integration tests. **Met.**

- **Senior QA pass + hardening** (2026-11-20): full live walkthrough of all three roles, a black-box API security/integrity battery, performance run at 60k transactions, and fixes for every High/Medium finding that did not need a product decision — see [QA-REPORT.md](QA-REPORT.md). Includes customer-initiated account closure in the UI, per-user rate limits, pagination of staff lists, new indexes, debounced search, route code-splitting, accessibility and mobile fixes.
  - Acceptance criteria: 108 server + 28 client tests green, production build green, each fix re-verified live. **Met.**
- **Verdant Bank identity & repo polish** (2026-11-20): logo, banner, favicon, social preview, rewritten README, Open Graph metadata, PR/issue templates, branch ruleset.

## In Progress
Nothing. Clean checkpoint.

## Next
*(Recommended order.)*

1. **Decide the funding model** — self-service deposit is the only way to fund an account and it mints money ([QA-REPORT.md](QA-REPORT.md) B5). Options: remove customer deposits, staff-approved cash deposits, or an external funding source. Product decision.
2. **Define loan approval policy** — maker-checker / dual approval above a threshold (QA B7). Product decision.
3. **Playwright smoke tests** for the three roles, and fill the page-component unit-test gaps (see [TESTING.md](TESTING.md)).
4. **Integer minor-unit money** and multi-document transactions (needs a replica set) to remove the compensating-write design.
5. **Cursor pagination / text index** once history approaches ~1M rows (QA P3).

## Later
5. Statement generation with PDF export.
6. Notifications (in-app first).
7. Deployment (Vercel/Render/Atlas) — needs user-provided hosting accounts/credentials.
8. Bonus features from [FUTURE_FEATURES.md](FUTURE_FEATURES.md) (dark mode, QR payments, multi-currency, etc.) — only after the above.

## Blocked
- **Deployment** — blocked on the user choosing/providing hosting + database credentials.
- Nothing else is currently blocked.
