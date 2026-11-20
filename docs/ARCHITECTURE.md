# Architecture

## Overview
Two independent services, no shared code:

```
banking-management/
├── client/   React 18 SPA (Vite), talks to server over REST/JSON + Bearer JWT
├── server/   Express REST API, MongoDB via Mongoose
└── docs/     This documentation set
```

There is no API gateway, no BFF layer, no server-side rendering — a plain SPA-to-REST-API architecture.

## Frontend Architecture (`client/`)
- **Entry**: `src/main.jsx` mounts `<App />` inside `BrowserRouter` and `AuthProvider`.
- **Routing**: `src/App.jsx` — a flat route table (`/`, `/login`, `/register`, `/dashboard`, `/loans`, `/employee`, `/admin`, `*`). Role-based gating via `<ProtectedRoute roles={[...]}>` (`src/components/ProtectedRoute.jsx`), which redirects to `/login` if unauthenticated or `/` if the role doesn't match. As of 2026-08-22, `App.jsx` also has a small `Shell` component (keyed off `useLocation()`) that renders `/login`/`/register` full-bleed with no `Navbar`/`page-container` chrome, and every other route inside the normal `Navbar` + `page-container` shell.
- **State management**: No Redux/Zustand/Context-heavy state tree. Just `AuthContext` (`src/context/AuthContext.jsx`) for the current user + JWT, and local `useState`/`useEffect` per page for data fetching. This is intentional at current scale — see [DECISIONS.md](DECISIONS.md).
- **API layer**: `src/api/axios.js` — a single Axios instance with a request interceptor that attaches `Authorization: Bearer <token>` from `localStorage`, and a response interceptor that clears stored auth on `401`.
- **Component structure**: Pages (`src/pages/`) own data fetching and layout — `CustomerDashboard`, `CustomerLoans` (new 2026-08-22), `EmployeeDashboard`, `AdminDashboard`, `Login`, `Register`, `NotFound`. Shared presentational pieces (`AccountCard`, `TransferForm`, `DepositForm`, `TransactionTable`, `Navbar`, `ProtectedRoute`) live in `src/components/`. As of 2026-08-22, a reusable design-system component set lives in `src/components/ui/`: `Icon` (hand-drawn SVG set, no icon-library dependency), `Button`, `Badge`, `Spinner`, `EmptyState`, `Skeleton` — every page and component was rebuilt on top of these during the redesign.
- **Tests** (added 2026-08-17): co-located with what they test as `*.test.jsx` (e.g. `TransactionTable.test.jsx` sits next to `TransactionTable.jsx`), run via Vitest. `src/api/axios.js` is mocked in any test that touches it — see [TESTING.md](TESTING.md). No new test files were added for the 2026-08-22 UI work (`CustomerLoans.jsx`, the `ui/` primitives, or the new EmployeeDashboard queues) — a known gap, see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).
- **Styling** (rebuilt 2026-08-22): still one global stylesheet (`src/index.css`), no CSS-in-JS, no component-scoped CSS modules, no UI-framework dependency — but now a systematic design-token system (color/type/spacing/radius/shadow/motion scales as CSS custom properties) rather than ad hoc rules. See [PROJECT_STYLE.md](PROJECT_STYLE.md) for the full token/component reference.

## Backend Architecture (`server/`)
Standard layered Express app:

```
app.js                → the Express app itself: middleware wiring, route mounting — NO side effects (no DB connect, no listen)
server.js             → thin entry point: requires app.js, connects DB, calls app.listen()
config/db.js          → Mongoose connection
models/                → Mongoose schemas (User, Account, Transaction, Loan — added 2026-08-22)
middleware/            → auth (JWT verify + RBAC), validate (express-validator results), errorHandler
controllers/            → request handlers (business logic lives here, not in routes)
routes/                 → route tables, wire validation + middleware + controller per endpoint
utils/                   → generateToken, generateAccountNumber, asyncHandler, loanSchedule (EMI/amortization math — added 2026-08-22, independently unit-tested)
scripts/                 → one-off CLI scripts, e.g. seedAdmin.js (run via `npm run seed:admin`), not part of the running server
tests/                    → Jest/Supertest suite (see TESTING.md) — imports app.js directly, never server.js
```

**Why `app.js` and `server.js` are split** (added 2026-08-17): before this, `server.js` called `connectDB()` and `app.listen()` as import-time side effects, which meant any test file that imported it would try to open a real database connection and bind a real port. `app.js` now exports a plain, side-effect-free Express app that Supertest can exercise directly in-process; `server.js` is the only thing that actually starts a live server.

- **Request lifecycle**: `helmet` → `cors` → `express.json()` → `express-mongo-sanitize` → rate limiter (`/api/*`) → route-specific validators (`express-validator`) → `protect` (JWT auth, when required) → `authorize(...)` (role check, when required) → controller (wrapped in `asyncHandler` so thrown/rejected errors reach `errorHandler`) → `errorHandler`.
- **Controllers are not wrapped in try/catch individually** — `utils/asyncHandler.js` forwards any rejected promise to Express's `next(err)`, and `middleware/errorHandler.js` is the single place that formats error responses.

## Authentication & Authorization
- **Auth**: JWT signed with `JWT_SECRET`, containing `{ id, role }`, default 7-day expiry (`JWT_EXPIRES_IN`). No refresh tokens, no rotation, no server-side revocation list.
- **Effective revocation on suspend**: `middleware/auth.js`'s `protect()` re-fetches the user from the DB on every request and rejects if `status !== 'active'`. So admin-suspending a user takes effect on their very next request, even though their JWT is still technically valid until expiry — there's just no separate blacklist.
- **Authorization**: `authorize('employee', 'admin')`-style middleware checks `req.user.role` after `protect()`. Three roles: `customer`, `employee`, `admin`. No finer-grained permissions system (no per-resource ACLs).

## Data Flow: Fund Transfer (the most interesting path)
1. Client generates a `clientRef` (UUID) and POSTs `{ fromAccount, toAccountNumber, amount, description, clientRef }` to `/api/transactions/transfer`.
2. Controller (`controllers/transactionController.js`) verifies the caller owns `fromAccount`, and that the destination account exists and is `Active`.
3. If `clientRef` was already processed for this source account, the existing transaction is returned instead of reprocessing (idempotency).
4. Debit leg: `Account.findOneAndUpdate({ _id: source, status: 'Active', balance: { $gte: amount } }, { $inc: { balance: -amount } })`. This is atomic at the MongoDB document level — if the balance check fails, the update matches nothing and the controller returns `400 Insufficient balance`.
5. Credit leg: `Account.findOneAndUpdate({ _id: destination, status: 'Active' }, { $inc: { balance: amount } })`.
6. If the credit leg fails (destination vanished/closed mid-request — a rare race), the debit is compensated with a refund `$inc` back onto the source account, and the request returns `409`.
7. Two `Transaction` documents are created (`transfer-debit` on the source, `transfer-credit` on the destination), sharing a `reference` (a fresh ObjectId string) so they can be correlated, each storing its own post-transfer `balanceAfter`.

This is **not** a true multi-document ACID transaction (no Mongoose session/replica set). It's "safe enough for a portfolio MVP" via atomic per-document updates + a best-effort compensating action — see [DECISIONS.md](DECISIONS.md) for the trade-off reasoning and [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for what a production version would need instead.

## Data Flow: Deposit
Simpler sibling of the transfer flow, added 2026-08-16 to let a customer fund their own account (see [DECISIONS.md](DECISIONS.md) for why this is self-service rather than staff-initiated). Same shape as steps 1-3 and 7 above, minus the second leg: one atomic `$inc` on the target account (`POST /api/transactions/deposit`), one `Transaction` document (`type: 'deposit'`, no `counterpartyAccount`), same `clientRef` idempotency check. No compensating-refund logic needed since there's only one account involved.

## Data Flow: Loan Application → Approval → Repayment (added 2026-08-22)
1. Customer POSTs `{ disbursalAccount, principal, termMonths, purpose? }` to `/api/loans`. Controller verifies ownership + `Active` status on `disbursalAccount`, creates a `Loan` with `status: 'Pending'` — no interest rate or schedule yet.
2. Staff (`employee`/`admin`) review the pending queue (`GET /api/loans/all?status=Pending`) and either:
   - **Reject** (`PATCH /api/loans/:id/reject`) — sets `status: 'Rejected'`, optional `reviewNote`, no money moves.
   - **Approve** (`PATCH /api/loans/:id/approve`), supplying `annualInterestRate` — the rate is a staff decision made at approval time, not chosen by the applicant (see [DECISIONS.md](DECISIONS.md)). This is the one place staff review has real agency rather than being a rubber stamp.
3. On approval: `Account.findOneAndUpdate({ _id: disbursalAccount, status: 'Active' }, { $inc: { balance: principal } })` — same atomic-conditional-update pattern as transfers/deposits. A `loan-disbursement` `Transaction` is recorded. `utils/loanSchedule.js#buildAmortizationSchedule` computes a full reducing-balance EMI schedule (one row per month: principal/interest/amount/status), stored on the `Loan` document itself (embedded array, not a separate collection — see [DATABASE.md](DATABASE.md)).
4. Customer repays via `POST /api/loans/:id/pay`, specifying any `Active` account they own (not required to be the disbursal account) plus an optional `clientRef` for idempotency (same pattern as transfers/deposits). The controller finds the first `Due` installment, debits its `amount` atomically (`balance >= amount` guard, same as a transfer's debit leg), records a `loan-repayment` `Transaction`, and marks that installment `Paid`.
5. When the last installment is paid, `Loan.status` automatically flips to `Closed` in the same request — no separate "close loan" action exists or is needed.

This reuses every safety pattern already established by transfers/deposits (atomic conditional updates, `clientRef` idempotency, ledger-style `Transaction` records) rather than inventing new ones — see [DECISIONS.md](DECISIONS.md) for why the EMI math itself was unit-tested independently before any of this controller code was written.

## Component Architecture (Frontend)
No global state library. Data ownership: each dashboard page fetches its own accounts/transactions/report on mount and after mutations (e.g., `CustomerDashboard` reloads accounts + transactions after a successful transfer). Shared components are presentational and receive data/callbacks via props — no component reaches into another's state.

## External Services
None currently integrated (no payment gateway, email/SMS provider, PDF renderer, or cloud storage).

## Deployment Architecture
**Not deployed.** Planned targets per the original brief (see [DEPLOYMENT.md](DEPLOYMENT.md)): Vercel (client), Render/Railway (server), MongoDB Atlas (database). A CI pipeline (`.github/workflows/ci.yml`, added 2026-08-22) now runs both test suites + the client build on push/PR to `main` — CI is not deployment, and no CD step exists — but it's a first step toward a real pipeline. Not yet verified by an actual GitHub Actions run.

## Security Boundaries
- All mutating endpoints require `protect` (valid JWT); role-sensitive ones additionally require `authorize(...)`.
- `express-mongo-sanitize` strips `$`/`.` operators from user input to block NoSQL injection via query/body.
- `express-validator` validates/normalizes auth, transfer, and (as of 2026-08-22) loan-application/approval inputs before they reach controllers.
- Rate limits: global API (300/15min), auth endpoints (20/15min), transfers (10/min), loan actions — approve/pay (10/min, added 2026-08-22) — see `server/routes/*.js`.
- Passwords hashed with bcrypt (cost factor 12), never returned in API responses (`select: false` on `User.password`, plus explicit field selection in `authController`).
- No HTTPS termination configured (dev-only `http`) — production deployment must terminate TLS at the host/proxy per the brief's "HTTPS" requirement; this is not yet done anywhere in code or config.
