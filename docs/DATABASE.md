# Database

MongoDB via Mongoose 8. Three collections, defined in `server/models/`.

## `User` (`models/User.js`)
| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `email` | String | required, unique, lowercase, trimmed |
| `password` | String | required, min 8, `select: false` (never returned by default), bcrypt-hashed (cost 12) on save via `pre('save')` hook |
| `role` | enum | `customer` (default) \| `employee` \| `admin` |
| `phone` | String | optional |
| `status` | enum | `active` (default) \| `suspended` |
| `timestamps` | — | `createdAt`, `updatedAt` |

Instance method: `comparePassword(candidate)` → bcrypt compare.

## `Account` (`models/Account.js`)
| Field | Type | Notes |
|---|---|---|
| `owner` | ObjectId → `User` | required |
| `accountNumber` | String | required, unique, 10 random digits (`utils/generateAccountNumber.js`), uniqueness enforced by retry loop (5 attempts) + DB unique index |
| `accountType` | enum | `Savings` (default) \| `Current` |
| `balance` | Number | required, default 0, `min: 0` (schema-level; the real guarantee against negative balances is the atomic conditional update in the transfer controller, not this validator alone) |
| `status` | enum | `Active` (default) \| `Closed` \| `PendingClosure` |
| `timestamps` | — | |

## `Transaction` (`models/Transaction.js`)
Ledger-entry model — **one document per account per transfer**, not one document per transfer. See [ARCHITECTURE.md](ARCHITECTURE.md) for why.

| Field | Type | Notes |
|---|---|---|
| `account` | ObjectId → `Account` | required, indexed — the account this ledger entry belongs to |
| `counterpartyAccount` | ObjectId → `Account` | the other side of the transfer |
| `type` | enum | `transfer-debit` \| `transfer-credit` \| `deposit` \| `withdrawal` (`deposit` implemented 2026-08-16 via `POST /transactions/deposit`; `withdrawal` still unused — no endpoint creates it) |
| `amount` | Number | required, `min: 0` |
| `balanceAfter` | Number | required — this account's balance immediately after this entry |
| `status` | enum | `completed` (default) \| `failed` \| `pending` (only `completed` is currently produced by any code path) |
| `reference` | String | required, indexed — shared between the debit+credit pair of one transfer |
| `clientRef` | String | indexed, optional — client-supplied idempotency key |
| `description` | String | optional |
| `timestamps` | — | |

## Relationships
- `User 1 — N Account` (`Account.owner`)
- `Account 1 — N Transaction` (`Transaction.account`)
- `Transaction.counterpartyAccount` is a same-collection reference to the other `Account` in the transfer (not the other `Transaction`).

## Indexes
- `User.email` — unique
- `Account.accountNumber` — unique
- `Transaction.account`, `Transaction.reference`, `Transaction.clientRef` — single-field indexes for the query patterns used in `transactionController.js` (`buildHistoryFilter`, clientRef idempotency lookup)

No compound indexes yet. If transaction history queries become slow at scale, a compound index on `{ account: 1, createdAt: -1 }` is the first candidate (matches the `find({account: ...}).sort({createdAt: -1})` pattern used by both history endpoints).

## Consistency Model
No multi-document transactions (would require a MongoDB replica set). Balance safety comes from atomic single-document conditional updates (`findOneAndUpdate` with a `balance >= amount` filter) plus a compensating refund if the second leg of a transfer fails. This is documented as a deliberate trade-off in [DECISIONS.md](DECISIONS.md), not an oversight — but it means a crash between the debit and credit steps (after the debit succeeds, before the credit is attempted) is not automatically rolled back the way a real ACID transaction would be. This is tracked in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

## Migrations / Seeding
No schema migration tooling exists (not needed yet — the schema hasn't changed since initial creation). There is one seed script: `server/scripts/seedAdmin.js` (`npm run seed:admin -- <email>`), which promotes an already-registered user to `admin` — added and verified 2026-08-14, see [CHANGELOG.md](CHANGELOG.md). It requires the target account to already exist via normal registration; it does not create users or set passwords.
