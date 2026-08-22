# API Documentation

Base URL (dev): `http://localhost:5000/api`

All request/response bodies are JSON. Authenticated routes require `Authorization: Bearer <jwt>`.

This document is derived directly from `server/routes/*.js` and `server/controllers/*.js` as of the initial scaffold. If it disagrees with the code, the code wins — update this file.

## Auth (`/api/auth`) — rate limited 20 req / 15 min

### `POST /api/auth/register`
Public. Creates a `customer` user.
- Body: `{ name, email, password (min 8 chars), phone? }`
- 201 → `{ token, user: { id, name, email, role } }`
- 409 if email already registered.

### `POST /api/auth/login`
Public.
- Body: `{ email, password }`
- 200 → `{ token, user: { id, name, email, role } }`
- 401 invalid credentials, 403 if user status is `suspended`.

### `GET /api/auth/me`
Auth required.
- 200 → `{ id, name, email, role, phone }`

## Accounts (`/api/accounts`) — all routes require auth

### `POST /api/accounts`
Any authenticated user. Opens a new account owned by the caller.
- Body: `{ accountType?: 'Savings' | 'Current' }` (defaults to `Savings`)
- 201 → the created `Account` (balance starts at 0, auto-generated 10-digit `accountNumber`)

### `GET /api/accounts/mine`
- 200 → array of the caller's own accounts.

### `GET /api/accounts/all`
Roles: `employee`, `admin`.
- Query: `search?` (regex match on `accountNumber`)
- 200 → array of accounts, each with `owner` populated (`name`, `email`).

### `GET /api/accounts/:id`
Owner of the account, or `employee`/`admin`.
- 200 → the account. 403 if caller is neither owner nor staff. 404 if not found.

### `POST /api/accounts/:id/request-closure`
Owner only.
- 400 if balance is not zero.
- Sets `status` to `PendingClosure`.

### `POST /api/accounts/:id/approve-closure`
Roles: `employee`, `admin`.
- 400 if the account is not currently `PendingClosure`, or if its balance is not zero.
- Sets `status` to `Closed`.

### `POST /api/accounts/:id/reject-closure`
Roles: `employee`, `admin`.
- 400 if the account is not currently `PendingClosure`.
- Reverts `status` to `Active`.

## Transactions (`/api/transactions`) — all routes require auth

### `POST /api/transactions/transfer` — rate limited 10 req / min
- Body: `{ fromAccount (Account _id), toAccountNumber, amount (> 0), description?, clientRef? }`
- 201 → `{ message, transaction }` (the debit-side ledger entry)
- 200 → if `clientRef` matches an already-processed transfer, returns the existing transaction instead of reprocessing.
- 400 insufficient balance / inactive account / same-account transfer / missing fields.
- 403 caller doesn't own `fromAccount`.
- 404 recipient account not found or inactive.
- 409 recipient became unavailable mid-transfer (debit is refunded server-side).

### `POST /api/transactions/deposit` — rate limited 10 req / min (shares the transfer limiter)
- Body: `{ account (Account _id), amount (> 0), description?, clientRef? }`
- 201 → `{ message, transaction }` (a single `deposit`-type ledger entry, no `counterpartyAccount`)
- 200 → if `clientRef` matches an already-processed deposit, returns the existing transaction instead of reprocessing.
- 400 non-positive amount / inactive account / missing fields.
- 403 caller doesn't own `account`.
- **Note**: unrestricted self-service, no upper limit — see [DECISIONS.md](DECISIONS.md) for why, and [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for the trade-off this leaves open.

### `GET /api/transactions/mine`
- Query: `accountId?` (must be owned by caller), `type?` (`transfer-debit` | `transfer-credit` | `deposit` | `withdrawal` | `loan-disbursement` | `loan-repayment`), `status?`, `search?` (matches `reference`, free-text `description`, **or** a counterparty's `accountNumber` — see below), `from?`/`to?` (ISO dates, filters `createdAt`), `page?` (default 1), `limit?` (default 20, max 100)
- `search` behavior: matches the internal `reference`, a free-text `description` substring, or any account whose `accountNumber` matches — checked against both `account` and `counterpartyAccount`. Scoped by the surrounding `account: {$in: ...}` filter on `/mine`, so search can never surface another customer's transactions.
- 200 → `{ items, total, page, pages }`, each item has `counterpartyAccount` populated with `accountNumber`.

### `GET /api/transactions/all`
Roles: `employee`, `admin`. Same query params as `/mine` (minus `accountId` scoping — this lists across all accounts).
- 200 → `{ items, total, page, pages }`, each item has both `account` and `counterpartyAccount` populated with `accountNumber`.

## Admin (`/api/admin`) — all routes require role `admin`

### `GET /api/admin/users`
- Query: `role?`, `search?` (regex on `name` or `email`)
- 200 → array of users. **Not paginated** — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

### `PATCH /api/admin/users/:id/status`
- Body: `{ status: 'active' | 'suspended' }`
- 200 → updated user. Takes effect immediately (see [ARCHITECTURE.md](ARCHITECTURE.md#authentication--authorization)).

### `PATCH /api/admin/users/:id/role`
- Body: `{ role: 'customer' | 'employee' | 'admin' }`
- 200 → updated user.

### `GET /api/admin/report`
- 200 → `{ userCount, activeAccountCount, totalBalance, transactionCount }`

## Loans (`/api/loans`) — all routes require auth

### `POST /api/loans`
Any authenticated user. Applies for a loan against an account the caller owns.
- Body: `{ disbursalAccount (Account _id), principal (> 0), termMonths (1-360), purpose? }`
- 201 → the created `Loan`, `status: 'Pending'`, no `schedule` yet.
- 403 caller doesn't own `disbursalAccount`. 400 if that account isn't `Active`, or if `principal`/`termMonths` fail validation.

### `GET /api/loans/mine`
- 200 → array of the caller's own loans, `disbursalAccount` populated with `accountNumber`.

### `GET /api/loans/all`
Roles: `employee`, `admin`.
- Query: `status?` (`Pending` | `Approved` | `Rejected` | `Closed`)
- 200 → array of loans, `borrower` populated (`name`, `email`) and `disbursalAccount` populated (`accountNumber`).

### `GET /api/loans/:id`
Borrower, or `employee`/`admin`.
- 200 → the loan (with schedule). 403 if caller is neither borrower nor staff. 404 if not found.

### `PATCH /api/loans/:id/approve` — rate limited 10 req / min
Roles: `employee`, `admin`. Sets the interest rate at approval time (not chosen by the applicant), disburses the principal, and generates the repayment schedule.
- Body: `{ annualInterestRate (0-100) }`
- 200 → the loan, now `status: 'Approved'`, with `emiAmount` and a full `schedule` (reducing-balance amortization — see `server/utils/loanSchedule.js`).
- Side effect: credits `principal` onto `disbursalAccount` and records a `loan-disbursement` transaction.
- 400 if the loan isn't `Pending`, or if the disbursal account is no longer `Active`. 404 if not found.

### `PATCH /api/loans/:id/reject`
Roles: `employee`, `admin`. No money moves.
- Body: `{ reviewNote? }`
- 200 → the loan, now `status: 'Rejected'`. 400 if the loan isn't `Pending`. 404 if not found.

### `POST /api/loans/:id/pay` — rate limited 10 req / min (shares the loan-action limiter)
Borrower only. Pays the next `Due` installment in full.
- Body: `{ account (an Active Account _id owned by the caller — not required to be the disbursal account), clientRef? }`
- 201 → `{ message, transaction, loan }` — a `loan-repayment` transaction, and the updated loan (installment marked `Paid`; `status` becomes `Closed` if that was the last one).
- 200 → if `clientRef` matches an already-processed payment, returns the existing transaction instead of reprocessing.
- 400 insufficient balance / inactive account / loan not `Approved` / no due installments. 403 caller isn't the borrower, or doesn't own `account`. 404 if not found.

## Health check
### `GET /api/health`
Public. 200 → `{ status: 'ok' }`. Does not check DB connectivity.

## Error shape
All errors: `{ message, errors? (express-validator array), stack? (non-production only) }` with an appropriate HTTP status set by the controller or defaulted to 500 by `errorHandler`.
