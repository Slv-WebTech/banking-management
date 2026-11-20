# Project Context

## Project Name
**Verdant Bank** — renamed 2026-08-22 from the generic working title "Banking Management System," alongside a full UI/UX redesign the name ties to (the app's emerald "verdant" color identity). The GitHub repo slug/URL (`banking-management`) was deliberately kept unchanged; only the product name changed. See [DECISIONS.md](DECISIONS.md).

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
Shipped a working **core MVP** first (auth → accounts → transfers → history → dashboards), verified end-to-end, before layering in further features. As of 2026-08-22, loan management, staff account-closure approval, and broader transaction search have all shipped on top of that MVP, alongside a full visual redesign. Statements, notifications, deployment, and the "bonus" list (dark mode, QR payments, multi-currency, etc.) remain deliberately deferred. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for sequencing and [FUTURE_FEATURES.md](FUTURE_FEATURES.md) for what's still out of scope.

## Current Project Status
**Live-tested and QA-hardened as of 2026-11-20.** Core MVP verified live since 2026-08-16; the redesign, loan management, closure approval and search were verified live in Chrome on 2026-11-20 as part of a full QA pass ([QA-REPORT.md](QA-REPORT.md)). A public git repository exists (`github.com/Slv-WebTech/banking-management`), 108 server + 28 client automated tests cover the highest-risk logic, and a CI workflow runs both suites and the client build on every PR. Still **not deployed anywhere**. See [TESTING.md](TESTING.md) for exactly what "verified" means for each feature.

## Technology Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite 5, React Router 6 | Fast dev server, minimal config, standard SPA routing. Plain CSS design-token system (no UI framework) as of the 2026-08-22 redesign. |
| Backend | Node.js + Express 4 | Matches project brief, simple REST API |
| Database | MongoDB + Mongoose 8 | User chose MongoDB over PostgreSQL for faster iteration on a portfolio project (see [DECISIONS.md](DECISIONS.md)) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` | Stateless auth matching the project brief |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `express-validator` | Baseline hardening for a financial-data app |
| Testing | Jest + Supertest + `mongodb-memory-server` (backend), Vitest + React Testing Library (frontend) | Added 2026-08-17; see [TESTING.md](TESTING.md) |
| CI | GitHub Actions | Added 2026-08-22, runs both test suites + the client build |

Full dependency lists live in `server/package.json` and `client/package.json` — treat those files as the source of truth, not this doc, since versions will drift.

## Major Architectural Decisions
See [DECISIONS.md](DECISIONS.md) for the full log. Highlights:
- Ledger-style transaction records (one debit + one credit document per transfer) rather than a single transfer record — extended 2026-08-22 to two more ledger types (`loan-disbursement`, `loan-repayment`) for the same reason.
- Atomic single-document balance updates (`findOneAndUpdate` with a `balance >= amount` guard) instead of multi-document MongoDB transactions, to avoid requiring a replica set in local dev — the same pattern loan repayment reuses.
- Client-supplied `clientRef` (UUID) for transfer idempotency — also reused for deposits and loan repayments.
- Loan interest rate is set by staff at approval time, not by the customer at application time (2026-08-22) — mirrors real underwriting and gives the staff review step actual agency.

## Important Constraints
- No MongoDB replica set assumed → no multi-document ACID transactions; balance safety relies on atomic single-document conditional updates plus a compensating refund if the credit leg fails.
- Two independent `package.json` files (`client/`, `server/`) with no monorepo tooling — simplest setup at this project's size.

## Assumptions
- Local development uses a local or Atlas MongoDB instance reachable via `MONGO_URI` (see `server/.env.example`).
- Single currency (₹ / INR formatting is hardcoded in the UI) — multi-currency is an explicit future feature, not supported now.

## Dependencies / Integrations
None external yet. No payment gateway, no email/SMS provider, no PDF library, no cloud storage. Loan management is now implemented (2026-08-22); "notification" and "statement" functionality from the original brief remain **not implemented** — see [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

## Current Limitations
- Not deployed anywhere.
- No statements/PDF, no notifications, no "update profile" endpoint.
- Staff lists (`/accounts/all`, `/admin/users`) return at most 100 rows per request (`?page`/`?limit`, total in `X-Total-Count`); the UI shows a truncation notice and relies on search to narrow.
- Self-service deposits create money with no funding source (deliberate, product decision pending — [QA-REPORT.md](QA-REPORT.md) B5); loan review has no dual-approval policy beyond "not your own" (B7).
- Page components have no direct unit tests and there are no end-to-end tests; the three roles were verified by a live QA pass, not by an automated browser suite.
- `client/` has 4 known npm audit vulnerabilities (3 moderate, 1 high) in dev dependencies — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).
- No real-device, cross-browser or screen-reader verification; no load testing beyond a 60k-transaction local dataset.

## Important Terminology
- **Ledger entry** — one `Transaction` document representing a single account's side of a transfer (debit or credit). A transfer always produces exactly two ledger entries sharing a `reference`.
- **clientRef** — a client-generated UUID sent with a transfer request so retried/duplicated requests are recognized and not double-processed.
- **Staff** — shorthand used in code/docs for `employee` or `admin` roles collectively.
