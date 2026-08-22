# Decisions

Architecture Decision Record log. Newest first.

---

**Decision**: Loan interest rate is set by staff at approval time, not chosen by the customer at application time.
**Date**: 2026-08-22
**Context**: Building the loan management module raised a question the original brief didn't specify: who decides the interest rate on an approved loan?
**Options considered**:
1. Customer proposes a rate at application time — simpler form, but lets an applicant pick a favorable rate with no underwriting, and gives the staff "review" step nothing to actually decide.
2. A single system-wide fixed rate for all loans — no staff agency either, and doesn't reflect how real underwriting varies rate by risk/term.
3. Staff sets the rate at approval time (this project's choice) — mirrors real underwriting, and makes "approve" a genuine decision rather than a rubber stamp.
**Decision**: Option 3. The application form only collects `principal`, `termMonths`, `disbursalAccount`, and an optional `purpose`; `annualInterestRate` is supplied by staff in the `PATCH /api/loans/:id/approve` request body (client defaults the input to 10% as a starting point, staff can change it).
**Reason**: Matches real banking practice and gives the employee/admin review step actual meaning.
**Consequences**: A customer applying for a loan has no visibility into the rate until it's approved — there's no rate-preview or negotiation step. Acceptable for a portfolio-scale demo; a real product would likely show a rate range up front.

---

**Decision**: Self-service deposit (customer deposits into their own account directly) instead of staff-initiated deposit.
**Date**: 2026-08-16
**Context**: Live end-to-end testing on 2026-08-14 found that no account could ever receive its first rupee — there was no deposit mechanism at all, only transfers between already-funded accounts. This blocked the core transfer feature from being usable by a real new user. Two ways to close the gap: let customers deposit into their own accounts directly, or require an employee/staff member to initiate the deposit (simulating a teller/cash counter).
**Options considered**:
1. Self-service deposit — customer clicks "Deposit," enters an amount, balance updates immediately. Simple, reuses the existing transfer/ledger pattern almost exactly, but unrealistic (real banks don't let customers conjure money).
2. Staff-initiated deposit — only employees/admins can credit an account. More realistic, but needs a new employee-side UI flow and a decision about audit trail / authorization for cash handling, which is a bigger scope than this pass warranted.
**Decision**: Option 1 (self-service).
**Reason**: User was asked directly and chose self-service, prioritizing "make the core flow actually usable end-to-end" over "model a fully realistic banking operations process." This is a portfolio project, not a real bank.
**Consequences**: A customer can inflate their own balance arbitrarily, with no cap and no real source of funds. Documented as a known, deliberate limitation in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md), not hidden. Staff-initiated deposits and/or a deposit cap remain a possible future upgrade — see [FUTURE_FEATURES.md](FUTURE_FEATURES.md).

---

**Decision**: Use per-document atomic conditional updates for transfers instead of Mongoose multi-document transactions.
**Date**: 2026-08-14
**Context**: Fund transfers need to guarantee no overdraft and no lost updates under concurrent requests. MongoDB multi-document ACID transactions require a replica set, which a default local `mongod` install doesn't provide.
**Options considered**:
1. Multi-document transactions (`session.startTransaction()`) — correct but requires replica-set infra even in local dev.
2. Application-level locking (e.g. a mutex per account) — adds complexity, doesn't survive multiple server instances.
3. Atomic single-document `findOneAndUpdate` with a `balance >= amount` guard for the debit, a second atomic update for the credit, and a compensating refund if the credit fails.
**Decision**: Option 3.
**Reason**: Keeps local dev/testing simple (no replica-set requirement) while still making the core safety property — never debit below zero — atomic and race-safe at the database level.
**Consequences**: The debit and credit are not atomic *as a pair*. A crash after the debit succeeds but before the credit is attempted would leave the transfer half-done (mitigated, not eliminated, by the compensating-refund code path on credit failure — it does not cover a process crash mid-flight). Production hardening would need either a replica set + real transactions, or an outbox/reconciliation job. Tracked in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

---

**Decision**: Model transactions as ledger entries (two documents per transfer) rather than one transfer document.
**Date**: 2026-08-14
**Context**: The brief requires a transaction history table showing "Available Balance" per row, per account.
**Options considered**:
1. One `Transaction` document per transfer with `fromAccount`/`toAccount` fields — simpler schema, but "balance after" is ambiguous (after for which side?).
2. One ledger-entry document per account per transfer (this project's choice) — mirrors how real bank ledgers work.
**Decision**: Option 2.
**Reason**: Makes `balanceAfter` unambiguous and the history query for "all activity on account X" a simple `find({account: X})` instead of an `$or` across two fields.
**Consequences**: Every transfer writes two documents instead of one; querying "both sides of one transfer" requires a second lookup by shared `reference`. Acceptable trade-off at this scale.

---

**Decision**: Client-generated `clientRef` (UUID) for transfer idempotency.
**Date**: 2026-08-14
**Context**: Network retries or accidental double-submits of the transfer form must not double-charge a customer.
**Options considered**:
1. No idempotency handling — simplest, but unsafe.
2. Server-generated idempotency key — doesn't help if the client's *first* request already succeeded but the client never saw the response (the classic retry-after-timeout case).
3. Client-generated UUID sent with the request, checked against existing `Transaction.clientRef` before processing.
**Decision**: Option 3.
**Reason**: Only the client knows whether a given "attempt" is a genuine retry of the same user action vs. a new transfer.
**Consequences**: Relies on the client actually generating and persisting the ref for the duration of one submit (done in `TransferForm.jsx` via `crypto.randomUUID()`). If the client doesn't send one, the transfer still works, just without idempotency protection for that request.

---

**Decision**: MongoDB over PostgreSQL.
**Date**: 2026-08-14
**Context**: The original brief allowed either. User was asked directly and chose MongoDB.
**Options considered**: MongoDB (Mongoose), PostgreSQL (Sequelize/Prisma).
**Decision**: MongoDB.
**Reason**: User's explicit choice, recommended for faster iteration on a portfolio-scale project.
**Consequences**: Financial data integrity (the property PostgreSQL's relational constraints + transactions would give more naturally) is instead enforced in application code (see the atomic-update decision above). This is a reasonable trade-off for a portfolio project but would be worth revisiting for anything handling real money at scale.

---

**Decision**: Core-MVP scope for the initial build — defer loans, statements, notifications, and all bonus features.
**Date**: 2026-08-14
**Context**: The full brief is large (loans, PDF statements, notifications, dark mode, QR payments, AI assistant, etc.). Attempting all of it in one pass risks shallow, unverified implementations across the board.
**Options considered**: "Core MVP" vs. "everything in the spec" — user was asked directly and chose Core MVP.
**Decision**: Auth, accounts, transfers, transaction history, and three role dashboards first; everything else deferred to [FUTURE_FEATURES.md](FUTURE_FEATURES.md).
**Reason**: A smaller, fully-working, verifiable slice is more valuable (and more honestly presentable in an interview — see [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md)) than a larger surface area of untested code.
**Consequences**: The app does not yet fulfill the full original brief. This is intentional and tracked, not a hidden gap.

---

**Decision**: New project directory `D:\banking-management` instead of reusing `D:\banking-app`.
**Date**: 2026-08-14
**Context**: `D:\banking-app` already contains an unrelated, in-progress "INP Admin Panel" React project (branch `ravi`, 8 modified files uncommitted) — not a banking system, and not something to build inside or overwrite.
**Decision**: Scaffold fresh at `D:\banking-management`, matching the folder name suggested in the original brief.
**Reason**: Avoids any risk of interfering with the user's existing uncommitted work in `banking-app`.
**Consequences**: Two unrelated projects now exist side by side on disk. Future sessions must not assume `banking-app` and `banking-management` are the same project.

---

**Decision**: No monorepo tooling (no npm/yarn workspaces, no Turborepo/Nx).
**Date**: 2026-08-14
**Context**: `client/` and `server/` are independent Node projects with no shared code.
**Decision**: Two plain, independent `package.json` files.
**Reason**: Simplest option that fits the project's size; a monorepo tool would add config overhead with no current shared-code benefit.
**Consequences**: If a shared types/validation package becomes worth extracting later, workspace tooling would need to be introduced then — not a blocker today.
