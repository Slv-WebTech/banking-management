# Project Context

## Project Name
Banking Management System (`banking-management`)

## Location
`D:\banking-management` — a standalone project, separate from `D:\banking-app` (an unrelated, pre-existing "INP Admin Panel" React project on the `ravi` branch with its own uncommitted work). Do not conflate the two when navigating the filesystem.

## Purpose
A portfolio-grade banking web application demonstrating authentication, role-based access control, transactional financial operations, and multi-role dashboards. Built from a project brief calling for account management, fund transfers, transaction history, loans, statements, and admin/employee tooling.

## Problem Being Solved
Demonstrates the core mechanics of a real banking backend/frontend: secure auth, safe money movement between accounts, auditable transaction history, and role-separated operational views (customer / employee / admin) — the kind of business logic and security discipline employers evaluate in backend/full-stack candidates.

## Target Users
- **Customers** — open accounts, transfer funds, view history.
- **Employees** — view customer accounts and transactions (operational visibility).
- **Administrators** — manage users (roles/status), view system-wide metrics.

## Primary Use Cases
1. A customer registers, opens a savings/current account, and transfers money to another account by account number.
2. A customer reviews their transaction history with search/filter/pagination.
3. An employee looks up a customer's account or transaction activity.
4. An admin suspends/reactivates a user, changes a user's role, or checks system totals.

## Product Vision
Ship a working **core MVP** first (auth → accounts → transfers → history → dashboards), verified end-to-end, before layering in loans, statements, notifications, and bonus features (dark mode, QR payments, multi-currency, etc.). See [PROJECT_PLAN.md](PROJECT_PLAN.md) for sequencing and [FUTURE_FEATURES.md](FUTURE_FEATURES.md) for what's deliberately deferred.

## Current Project Status
**Initial scaffold complete, unverified against a live database.** Backend and frontend were built together, dependencies installed, and both were smoke-tested (module load checks, syntax checks, `vite build`) — but the app has **not yet been run end-to-end against a real MongoDB instance**, has no automated tests, is not in a git repository yet, and is not deployed. Treat every "works" claim in this doc set as "compiles/loads cleanly," not "verified in the browser," until [TESTING.md](TESTING.md) says otherwise.

## Technology Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite 5, React Router 6 | Fast dev server, minimal config, standard SPA routing |
| Backend | Node.js + Express 4 | Matches project brief, simple REST API |
| Database | MongoDB + Mongoose 8 | User chose MongoDB over PostgreSQL for faster iteration on a portfolio project (see [DECISIONS.md](DECISIONS.md)) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` | Stateless auth matching the project brief |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `express-validator` | Baseline hardening for a financial-data app |

Full dependency lists live in `server/package.json` and `client/package.json` — treat those files as the source of truth, not this doc, since versions will drift.

## Major Architectural Decisions
See [DECISIONS.md](DECISIONS.md) for the full log. Highlights:
- Ledger-style transaction records (one debit + one credit document per transfer) rather than a single transfer record.
- Atomic single-document balance updates (`findOneAndUpdate` with a `balance >= amount` guard) instead of multi-document MongoDB transactions, to avoid requiring a replica set in local dev.
- Client-supplied `clientRef` (UUID) for transfer idempotency.

## Important Constraints
- No MongoDB replica set assumed → no multi-document ACID transactions; balance safety relies on atomic single-document conditional updates plus a compensating refund if the credit leg fails.
- Two independent `package.json` files (`client/`, `server/`) with no monorepo tooling — simplest setup at this project's size.

## Assumptions
- Local development uses a local or Atlas MongoDB instance reachable via `MONGO_URI` (see `server/.env.example`).
- Single currency (₹ / INR formatting is hardcoded in the UI) — multi-currency is an explicit future feature, not supported now.

## Dependencies / Integrations
None external yet. No payment gateway, no email/SMS provider, no PDF library, no cloud storage. All "notification," "statement," and "loan" functionality described in the original brief is **not implemented** — see [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

## Current Limitations
- No automated tests of any kind.
- No CI/CD.
- Not deployed anywhere.
- No git repository yet in `D:\banking-management`.
- No loans, statements/PDF, or notifications.
- Account closure has a request step (customer) but no approval/finalization step (staff) — partially implemented.
- Admin user list has no pagination.
- `client/` has 4 known npm audit vulnerabilities (3 moderate, 1 high) in dev dependencies — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

## Important Terminology
- **Ledger entry** — one `Transaction` document representing a single account's side of a transfer (debit or credit). A transfer always produces exactly two ledger entries sharing a `reference`.
- **clientRef** — a client-generated UUID sent with a transfer request so retried/duplicated requests are recognized and not double-processed.
- **Staff** — shorthand used in code/docs for `employee` or `admin` roles collectively.
