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

## In Progress
Nothing. Clean checkpoint.

## Next
*(Recommended order.)*

1. **CI pipeline** — now genuinely actionable since a real test suite exists to run. GitHub Actions is the natural choice given the repo is already on GitHub.
2. **Staff account-closure approval endpoint** — completes the one partially-implemented feature already in the codebase.
3. **Fill the automated-suite gaps** — `TransferForm.jsx` especially (carries as much risk as the now-tested `DepositForm.jsx`), plus coverage reporting. See [TESTING.md](TESTING.md)'s gaps list.
4. **Human-searchable transaction search** (by counterparty account number / description, not just the internal reference) — small, and would have made manual testing easier both times it's been done so far.
5. **Deposit cap or staff-initiated deposit** — optional realism upgrade now that self-service deposit exists; see [DECISIONS.md](DECISIONS.md) and [FUTURE_FEATURES.md](FUTURE_FEATURES.md). Not urgent — the current version is a deliberate, documented trade-off, not a bug.

## Later
6. Loan management module (new model + controller/routes + UI, both customer and employee sides).
7. Statement generation with PDF export.
8. Notifications (in-app first).
9. Deployment (Vercel/Render/Atlas) — needs user-provided hosting accounts/credentials.
10. Bonus features from [FUTURE_FEATURES.md](FUTURE_FEATURES.md) (dark mode, QR payments, multi-currency, etc.) — only after the above.

## Blocked
- **Deployment** — blocked on the user choosing/providing hosting + database credentials.
- Nothing else is currently blocked.
