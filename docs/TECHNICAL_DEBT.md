# Technical Debt

Ordered roughly by priority. Nothing here is hidden or downplayed — this is the honest gap list.

## High
1. **No true multi-document transaction for transfers.** Debit and credit legs are two separate atomic operations plus a best-effort compensating refund, not one ACID transaction. A process crash between the two steps is not automatically recovered. See [DECISIONS.md](DECISIONS.md) for the trade-off reasoning. Now covered by `server/tests/transactions.test.js` for the sequential/idempotent-retry cases; still not load-tested for true concurrency.

## Medium
2. **Automated test suite has real gaps.** No tests for `TransferForm.jsx`, the page components (`Login`, `Register`, `CustomerDashboard`, `EmployeeDashboard`, `AdminDashboard`, `CustomerLoans`), `AccountCard.jsx`, or `Navbar.jsx`. No coverage reporting configured, so there's no number attached to how much of the codebase the passing tests actually exercise. No e2e (Playwright) tests. Backend loan logic (`loanController.js`, `loanSchedule.js`) is well covered (27 tests); the frontend loan/closure-approval UI built 2026-08-22 has zero automated coverage. See [TESTING.md](TESTING.md)'s "Known Gaps In The Automated Suite" for the full list.
3. **Client npm audit findings (4: 3 moderate, 1 high).**
   - `react-router-dom` → open-redirect / SSR hydration constructor injection advisories. `npm audit fix` did not auto-resolve (fix likely requires a version outside the current `^6.26.0` range). Needs a deliberate version bump + retest, not an automatic `--force`.
   - `esbuild` (via `vite`) → dev server can be sent requests from any website. Dev-only impact (doesn't ship to production bundles), but the fix requires a breaking Vite 5 → 8 major upgrade.
4. **Admin user list has no pagination.** `GET /admin/users` returns every user in one response — fine at portfolio scale, will not scale.
5. **No structured logging.** Only `console.log`/`console.error`. No request logging (no `morgan` or equivalent), no correlation IDs, nothing that would help debug a production incident.
6. **No ESLint/Prettier configured in either `client/` or `server/`.** Code style has been kept consistent by hand during the initial scaffold, but nothing enforces it going forward.
7. **Self-service deposit has no upper limit.** *(2026-08-16, see [DECISIONS.md](DECISIONS.md).)* A customer can deposit any amount into their own account with no cap and no source of funds — realistic for "give the portfolio demo a balance to play with," not realistic as an actual bank feature. Documented trade-off, not an oversight; revisit if this project ever needs to look more like a real bank than a demo.
8. **Loan applications have no minimum-review criteria or credit check.** Staff can approve any pending loan at any rate they type in, with no automated sanity checks (e.g. no income/existing-debt comparison). This mirrors the self-service-deposit trade-off above — realistic enough for a portfolio demo, not for a real bank.

## Low
9. **No "update profile" endpoint** for customers, despite being listed in the original brief's account-management features.
10. **`Transaction.type` enum still includes an unused `withdrawal` value** — `deposit`, `loan-disbursement`, and `loan-repayment` are all implemented, but there's no corresponding "withdraw cash" flow. Not harmful, just unused schema surface.
11. **No compound index on `{ account: 1, createdAt: -1 }`** for `Transaction` — current single-field indexes are adequate at low volume; revisit if history queries get slow.
12. **UI has no toast/notification system** — success/error feedback is inline text per form only, and doesn't persist across navigation.
13. **CI does not yet have a first real run to point to** — `.github/workflows/ci.yml` was added 2026-08-22 but hasn't executed against a real push yet, so its actual green/red status is unverified.

## Explicitly Not Debt (deliberate scope cuts, tracked separately)
Statements/PDF, notifications, and all "bonus" features (dark mode, QR, multi-currency, AI assistant, etc.) are **not debt** — they were never in scope for this pass. See [FUTURE_FEATURES.md](FUTURE_FEATURES.md) and the Core-MVP decision in [DECISIONS.md](DECISIONS.md). (Loans moved out of this section 2026-08-22 — now implemented, see Resolved below.)

## Resolved
- ~~No CI pipeline~~ — `.github/workflows/ci.yml` added 2026-08-22 (server tests + client tests + build, on push/PR to `main`). Not yet verified by an actual run — tracked as item 13 above.
- ~~Account closure flow is half-built~~ — `POST /accounts/:id/approve-closure` and `.../reject-closure` added 2026-08-22, with an EmployeeDashboard "Pending Closures" queue. `server/tests/accounts.test.js` covers ownership (customer cannot self-approve) and the not-pending 400 case.
- ~~Transaction `search` filter only matches the internal `reference` field~~ — extended 2026-08-22 to also match free-text `description` and a counterparty's account number, via `server/controllers/transactionController.js`'s unified `buildHistoryFilter`. Covered by three new tests in `server/tests/transactions.test.js`, including one confirming search never leaks another customer's transactions.
- ~~No loan management~~ — full apply → staff approve/reject → EMI repayment flow added 2026-08-22 (`server/models/Loan.js`, `server/utils/loanSchedule.js`, `server/controllers/loanController.js`, `client/src/pages/CustomerLoans.jsx`, staff queue in `EmployeeDashboard.jsx`). The EMI/amortization math has its own 13-test unit suite (`loanSchedule.test.js`) with hand-derived exact expected values, given this was explicitly flagged as needing careful testing before being trusted. See [IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md).
- ~~No automated tests~~ — Jest/Supertest/`mongodb-memory-server` (backend) and Vitest/React Testing Library (frontend) added 2026-08-17, 53 tests passing at the time. Required a small necessary refactor: `server/server.js` split into `app.js` (the exportable Express app, no side effects) + a thin `server.js` entry point (connects DB, listens) so tests can import the app without a real DB connection or port bind. See [ARCHITECTURE.md](ARCHITECTURE.md) and [TESTING.md](TESTING.md). Real gaps remain in the suite — tracked as item 2 above, not hidden by calling this fully done.
- ~~Not a git repository~~ — `git init` + initial commit done 2026-08-17, pushed to `github.com/Slv-WebTech/banking-management` (private) using the personal SSH identity.
- ~~No admin bootstrap path~~ — fixed 2026-08-14 via `server/scripts/seedAdmin.js` (`npm run seed:admin -- <email>`), promotes an already-registered user to `admin`. See [DATABASE.md](DATABASE.md).
- ~~No way to fund an account~~ — fixed 2026-08-16 via self-service deposit (`POST /api/transactions/deposit`, `DepositForm.jsx`). See [IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md) and [DECISIONS.md](DECISIONS.md) for the self-service-vs-staff-initiated trade-off this introduced (tracked as item 7 above).
- ~~`TransactionTable` mislabels non-transfer-credit transactions as "Debit"~~ — this bug was introduced and fixed within the same 2026-08-16 session, while building the deposit feature (a `deposit`-type transaction would have displayed as "Debit" under the old ternary logic). Caught before it ever shipped to a user; now has a dedicated regression test (`TransactionTable.test.jsx`) so it can't silently reappear. See [CHANGELOG.md](CHANGELOG.md).
