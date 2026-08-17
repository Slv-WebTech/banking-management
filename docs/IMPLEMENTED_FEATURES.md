# Implemented Features

Factual record of what exists in code today. **Updated 2026-08-16**: everything below was verified with a real, live end-to-end run — real MongoDB, real HTTP requests, and for the UI-facing items, real clicks in a real browser. See [TESTING.md](TESTING.md) for the full verification log (exact requests made, exact results, what's still not covered).

## Authentication
- **What**: Register, login, session restore via JWT.
- **Where**: `server/controllers/authController.js`, `server/routes/authRoutes.js`, `client/src/context/AuthContext.jsx`, `client/src/pages/Login.jsx`, `client/src/pages/Register.jsx`.
- **Dependencies**: MongoDB `User` collection, `JWT_SECRET` env var.
- **Testing status**: **Verified live.** Register and login confirmed via API for 5 real users; register→dashboard redirect and login→role-correct-dashboard redirect both confirmed via real browser clicks; a suspended user's already-issued JWT was confirmed to be rejected (401) on the very next request.
- **Known limitations**: no email verification, no password reset/forgot-password flow, no refresh tokens, 20 req/15min rate limit on both register and login from the same limiter instance.

## Account Management
- **What**: Open account (auto-generated unique 10-digit number), list own accounts, fetch by id (owner or staff), staff-wide search, request closure.
- **Where**: `server/controllers/accountController.js`, `server/routes/accountRoutes.js`, `client/src/pages/CustomerDashboard.jsx`, `client/src/components/AccountCard.jsx`.
- **Dependencies**: `User` (owner ref).
- **Testing status**: **Verified live** for account creation, listing, and staff search/view (via both API and browser). **Not exercised**: `request-closure` (no UI wired to it, and it wasn't hit directly via API this pass either).
- **Known limitations**: closure request has no staff-side approval endpoint yet (account gets stuck in `PendingClosure`); no "update profile" flow despite being in the original brief; no dedicated account-detail page in the UI.

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
- **What**: Paginated, filterable (type/status/search/date range) history for the caller's own accounts, and a staff-wide equivalent.
- **Where**: `server/controllers/transactionController.js` (`getMyTransactions`, `listAllTransactions`), `client/src/components/TransactionTable.jsx`.
- **Dependencies**: `Transaction`, `Account`.
- **Testing status**: **Verified live** for both the customer and staff views, including the account-number search filter on the staff account list. **Not tested**: pagination beyond page 1 (too little test data), the transaction-history `type`/`status`/date-range filters specifically (only the account-search filter on the Employee Dashboard was exercised in the browser).
- **Known limitations**: `search` only matches the `reference` field (an internal ObjectId string), not a human-friendly search — a customer can't search by counterparty account number or description text today.

## Role-Based Dashboards
- **What**: Three distinct dashboards gated by `ProtectedRoute`, matching `customer`/`employee`/`admin` roles.
- **Where**: `client/src/pages/CustomerDashboard.jsx`, `EmployeeDashboard.jsx`, `AdminDashboard.jsx`, `client/src/components/ProtectedRoute.jsx`.
- **Testing status**: **Verified live** — all three dashboards rendered and were interacted with in a real browser under their correct role; zero JavaScript console errors observed across the full session.
- **Known limitations**: employee dashboard has no loan-approval or "customer request" handling (not built); admin dashboard's user table has no pagination.

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
