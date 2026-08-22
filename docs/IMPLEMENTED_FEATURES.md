# Implemented Features

Factual record of what exists in code today. Everything below was verified with a real, live end-to-end run — real MongoDB, real HTTP requests, and for the UI-facing items, real clicks in a real browser (2026-08-14 and 2026-08-16). **As of 2026-08-17**, the highest-risk logic (auth, authorization, transfer/deposit atomicity+idempotency) also has automated regression tests — see [TESTING.md](TESTING.md) for the full verification log and exactly which "Testing status" lines below now also mean "and there's a test for this."

## Authentication
- **What**: Register, login, session restore via JWT.
- **Where**: `server/controllers/authController.js`, `server/routes/authRoutes.js`, `client/src/context/AuthContext.jsx`, `client/src/pages/Login.jsx`, `client/src/pages/Register.jsx`.
- **Dependencies**: MongoDB `User` collection, `JWT_SECRET` env var.
- **Testing status**: **Verified live.** Register and login confirmed via API for 5 real users; register→dashboard redirect and login→role-correct-dashboard redirect both confirmed via real browser clicks; a suspended user's already-issued JWT was confirmed to be rejected (401) on the very next request.
- **Known limitations**: no email verification, no password reset/forgot-password flow, no refresh tokens, 20 req/15min rate limit on both register and login from the same limiter instance.

## Account Management
- **What**: Open account (auto-generated unique 10-digit number), list own accounts, fetch by id (owner or staff), staff-wide search, request closure, and (added 2026-08-22) staff approval/rejection of a pending closure.
- **Where**: `server/controllers/accountController.js`, `server/routes/accountRoutes.js`, `client/src/pages/CustomerDashboard.jsx`, `client/src/components/AccountCard.jsx`, `client/src/pages/EmployeeDashboard.jsx` ("Pending Closures" queue, added 2026-08-22).
- **Dependencies**: `User` (owner ref).
- **Testing status**: **Verified live** for account creation, listing, and staff search/view (via both API and browser). `request-closure`/`approve-closure`/`reject-closure` are now covered by automated tests (`server/tests/accounts.test.js`) but have **not** been exercised live in a browser.
- **Known limitations**: no "update profile" flow despite being in the original brief; no dedicated account-detail page in the UI.

## Account Funding (Deposit)
- **What**: Self-service deposit into any account the caller owns — atomic balance update, idempotency via `clientRef`, single-sided `Transaction` ledger entry (`type: 'deposit'`, no counterparty). Added 2026-08-16 to close the gap described below.
- **Where**: `server/controllers/transactionController.js` (`depositFunds`), `server/routes/transactionRoutes.js` (`POST /transactions/deposit`), `client/src/components/DepositForm.jsx`, wired into `CustomerDashboard.jsx`.
- **Dependencies**: `Account`, `Transaction`.
- **Testing status**: **Verified live**, both API and browser: successful deposit with correct `balanceAfter`, idempotent retry with the same `clientRef` correctly returning the original result instead of double-depositing, negative-amount rejected by validation (400). Also verified the resulting `deposit`-type transaction displays correctly (as "Deposit") in the transaction history table and its type filter — see the note below.
- **Known limitations**: unrestricted self-service, no upper limit, no realism check (a customer can deposit any amount at will) — an explicit, documented trade-off (see [DECISIONS.md](DECISIONS.md)), not an oversight. Same 10 req/min rate limit as transfers.
- **Bug found and fixed while building this**: `TransactionTable.jsx`'s type-label logic used to be `tx.type === 'transfer-credit' ? 'Credit' : 'Debit'`, which would have mislabeled any `deposit` transaction as "Debit". Fixed to a proper label map before this ever reached a user; see [CHANGELOG.md](CHANGELOG.md).

## Fund Transfer
- **What**: Transfer between accounts by account number, atomic balance updates, idempotency via `clientRef`, ledger-pair transaction records.
- **Where**: `server/controllers/transactionController.js` (`transferFunds`), `client/src/components/TransferForm.jsx`.
- **Dependencies**: `Account`, `Transaction`.
- **Testing status**: **Verified live**, both API and browser: insufficient-balance rejection (400, source untouched), successful transfer with correct `balanceAfter` on both ledger legs, idempotent retry with the same `clientRef` correctly returning the original result instead of double-processing, cross-user visibility of the credited side. **Not tested**: true concurrent/simultaneous requests against the same account (only sequential requests, including a deliberate duplicate retry, have been exercised).
- **Known limitations**: no true multi-document transaction (see [ARCHITECTURE.md](ARCHITECTURE.md)); 10 req/min rate limit per authenticated user. **Resolved 2026-08-16**: a freshly-registered customer can now actually fund their account via self-service deposit (see above) and then use transfers — this feature is no longer blocked end-to-end for a new user.

## Transaction History
- **What**: Paginated, filterable (type/status/search/date range) history for the caller's own accounts, and a staff-wide equivalent. As of 2026-08-22, `search` matches free-text `description` or a counterparty's account number, not just the internal `reference`.
- **Where**: `server/controllers/transactionController.js` (`getMyTransactions`, `listAllTransactions`, unified `buildHistoryFilter`), `client/src/components/TransactionTable.jsx`.
- **Dependencies**: `Transaction`, `Account`.
- **Testing status**: **Verified live** for both the customer and staff views, including the account-number search filter on the staff account list. The broader search behavior (description match, counterparty-account match, and that it can't leak another customer's transactions) is covered by automated tests but **not yet exercised live**. **Not tested**: pagination beyond page 1 (too little test data), the `type`/`status`/date-range filters specifically.
- **Known limitations**: none currently tracked for search quality (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for what's resolved).

## Loan Management
- **What**: Customer applies for a loan against one of their active accounts (principal, term, optional purpose). Staff review the queue and either approve — setting the interest rate, which disburses the principal and generates a reducing-balance EMI amortization schedule — or reject (with an optional note). Customer repays installments from any of their active accounts; the loan auto-closes once every installment is paid.
- **Where**: `server/models/Loan.js`, `server/utils/loanSchedule.js` (pure EMI/amortization math), `server/controllers/loanController.js`, `server/routes/loanRoutes.js`, `client/src/pages/CustomerLoans.jsx`, staff queue in `client/src/pages/EmployeeDashboard.jsx`.
- **Dependencies**: `Account` (disbursal + repayment), `Transaction` (`loan-disbursement`/`loan-repayment` ledger entries), `User` (borrower, reviewer).
- **Testing status**: **Not yet verified live** (needs a running MongoDB instance). Automated coverage is thorough: `loanSchedule.test.js` (13 tests) independently verifies the EMI formula and amortization schedule construction — including hand-derived exact expected values, a zero-interest edge case, and a check that per-installment rounding always sums back to exactly the original principal — before any controller code was written on top of it. `loans.test.js` (14 tests) covers the full apply/approve/reject/repay integration: ownership checks on both the disbursal and repayment account, idempotent repayment retries via `clientRef`, insufficient-balance rejection, disbursement/repayment ledger correctness, and auto-close on the final installment.
- **Known limitations**: interest rate is set by staff at approval time, not chosen by the applicant (see [DECISIONS.md](DECISIONS.md)). No credit check or automated approval criteria — staff can approve any pending loan at any rate. No partial/early repayment, no penalty for a missed due date, no email/notification on approval or rejection. Zero frontend automated test coverage for `CustomerLoans.jsx` or the staff review queue.

## Role-Based Dashboards
- **What**: Three distinct dashboards gated by `ProtectedRoute`, matching `customer`/`employee`/`admin` roles. As of 2026-08-22, the employee dashboard also includes a loan-application review queue and a pending-account-closure queue.
- **Where**: `client/src/pages/CustomerDashboard.jsx`, `EmployeeDashboard.jsx`, `AdminDashboard.jsx`, `CustomerLoans.jsx`, `client/src/components/ProtectedRoute.jsx`.
- **Testing status**: **Verified live** (through 2026-08-17) — all three original dashboards rendered and were interacted with in a real browser under their correct role; zero JavaScript console errors observed across the full session. The 2026-08-22 redesign and the loan/closure-approval additions have **not** been re-verified live yet.
- **Known limitations**: admin dashboard's user table has no pagination.

## Admin User Management
- **What**: List/search/filter users, suspend/activate, change role, system-wide report (user/account/balance/transaction counts).
- **Where**: `server/controllers/adminController.js`, `client/src/pages/AdminDashboard.jsx`.
- **Testing status**: **Verified live**, both API and browser: suspend/reactivate toggled a real user's status and immediately affected their access; role-change dropdown persisted a real promotion; the report's counts/totals were cross-checked by hand against the actual seeded data and matched exactly.
- **Known limitations**: no audit log of who changed what; no protection against an admin demoting/suspending themselves; no pagination on the user list.

## Admin Bootstrap
- **What**: `server/scripts/seedAdmin.js` (`npm run seed:admin -- <email>`) promotes an already-registered user to `admin` without touching the database by hand.
- **Where**: `server/scripts/seedAdmin.js`, `server/package.json` (`seed:admin` script).
- **Testing status**: **Verified live** — used to create the actual first admin user during this testing pass.
- **Known limitations**: requires the target user to already be registered (by design — it promotes, it doesn't create accounts with a set password).

## Security Baseline
- **What**: `helmet`, `cors` (locked to `CLIENT_URL`), tiered `express-rate-limit`, `express-mongo-sanitize`, `express-validator` on auth/transfer inputs, bcrypt password hashing (cost 12), centralized error handling that hides stack traces outside development.
- **Where**: `server/server.js`, `server/middleware/`, route-level validators.
- **Testing status**: Role/ownership boundaries verified live (customer correctly blocked with 403 from staff-only endpoints and from viewing another customer's account; no-token requests correctly rejected with 401). **Not tested**: rate limiting thresholds, `mongo-sanitize` against an actual injection attempt, or any adversarial/security-specific testing — this remains a baseline, not an audit result.
- **Known limitations**: no HTTPS in this codebase (must be terminated by the deployment host), no CSRF concern applicable (pure bearer-token API, no cookies), no 2FA, no dependency vulnerability fixes applied yet for the client's 4 npm audit findings.
