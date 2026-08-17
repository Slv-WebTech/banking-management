# Changelog

Human-readable development history. Newest first.

## 2026-08-17 (later) — Automated test suite + commit identity fix
**Feature/fix**: New capability (automated tests) + a correction to the previous commit.

**Important files**: `server/app.js` (new — Express app extracted from `server.js`, no side effects), `server/server.js` (now a thin entry point), `server/jest.config.js` (new), `server/tests/` (new — `setup.js`, `helpers.js`, `auth.test.js`, `accounts.test.js`, `transactions.test.js`, `admin.test.js`), `server/routes/authRoutes.js` + `transactionRoutes.js` (rate limiters now skip under `NODE_ENV=test`), `client/vite.config.js` (added `test` block), `client/src/test/setup.js` (new), `client/src/context/AuthContext.test.jsx`, `client/src/components/ProtectedRoute.test.jsx`, `client/src/components/TransactionTable.test.jsx`, `client/src/components/DepositForm.test.jsx` (all new).

**What was built**: Jest + Supertest + `mongodb-memory-server` for the backend (32 tests across 4 files), Vitest + React Testing Library for the frontend (21 tests across 4 files). Coverage follows the priority list [TESTING.md](TESTING.md) laid out after the two manual verification sessions: transfer/deposit atomicity and idempotency, auth and suspension behavior (including the live-DB-role-check design), ownership/role authorization boundaries, pagination/filtering, and — deliberately — a regression test for the `TransactionTable` type-label bug found and fixed on 2026-08-16, so that specific mistake can't silently reappear.

**Architectural changes**: `server.js` split into `app.js` (exportable Express app, no `connectDB()`/`listen()` side effects) + a thin `server.js` (imports `app.js`, connects, listens) — a small, necessary refactor for Supertest to be able to import the app without a real network/DB connection. No behavior change; verified the running dev server still worked correctly after the split (nodemon auto-restarted, health check and login both still returned correct responses).

**Breaking changes**: none.

**Migrations**: none.

**Notable decisions**: one `mongodb-memory-server` instance per backend test file (via `setupFilesAfterEnv`) rather than one shared instance for the whole run — simpler isolation, standard pattern, accepted the ~70s total runtime cost. Rate limiters explicitly skip in `NODE_ENV=test` rather than being mocked out, so the *rest* of each limiter's behavior stays identical to production in tests.

**Also this session**: fixed the initial commit's author/committer identity. The very first commit had been pushed with author "VivekLZT" (the machine's global git identity) and a "Co-Authored-By: Claude" trailer; the user asked for both removed. Fixed via `git commit --amend --author=...` combined with one-off `GIT_COMMITTER_NAME`/`GIT_COMMITTER_EMAIL` environment variables (not `git config`, which this project's operating rules never touch) — both fields now correctly show `Slv-WebTech <70682890+Slv-WebTech@users.noreply.github.com>`, matched to the actual numeric GitHub ID so the commit links to the profile. Required a `--force-with-lease` push to `main` since the original commit was already on the remote — done only after explicit confirmation, since rewriting pushed history on a default branch is exactly the kind of action this project's operating rules hold back on without it.

**Result**: the project now has real regression protection for its highest-risk logic, and its git history correctly attributes authorship without exposing AI-assistance in the commit trail (the user's explicit preference for this repo).

## 2026-08-17 — Version control: git init + push to GitHub
**Feature/fix**: Infrastructure — no code changes.

**What happened**: `git init` at `D:\banking-management`, branch renamed `master` → `main`, initial commit (66 files, 7096 lines) covering everything built through the 2026-08-16 deposit feature. Created a new private repo `github.com/Slv-WebTech/banking-management` via `gh repo create`, added it as `origin` using the `github-personal` SSH host alias (not the environment's default work identity), pushed and set upstream tracking.

**Important files**: none changed — this commit is the baseline.

**Notable decisions**: repo created private (matches the majority pattern of the user's other repos, no reason to default public); pushed via the personal SSH identity specifically, per explicit instruction — this project's remote must continue using `github-personal`, never the default `github.com` alias (which resolves to a different, work identity in this environment).

**Result**: the fully-working Core MVP state now has version history and an off-machine backup, before the automated-test-suite work begins.

## 2026-08-16 — Self-service deposit feature (closes the funding gap)
**Feature/fix**: New feature — the account-funding mechanism found missing on 2026-08-14.

**Important files**: `server/controllers/transactionController.js` (new `depositFunds`), `server/routes/transactionRoutes.js` (new `POST /transactions/deposit`), `client/src/components/DepositForm.jsx` (new), `client/src/pages/CustomerDashboard.jsx` (wired in), `client/src/components/TransactionTable.jsx` (bug fix, see below).

**What was built**:
- `depositFunds` controller: atomic `$inc` balance update, ownership + active-status checks, `clientRef` idempotency, single-sided `Transaction` ledger entry (`type: 'deposit'`) — mirrors the existing `transferFunds` pattern exactly, per [PROJECT_STYLE.md](PROJECT_STYLE.md)'s "reuse existing patterns" convention.
- `DepositForm.jsx`: mirrors `TransferForm.jsx`'s structure and UX conventions (same field/button/error-text patterns).
- Verified live: successful deposit with correct balance, idempotent duplicate-retry protection, negative-amount validation rejection — via both direct API calls and real browser clicks. Full results in [TESTING.md](TESTING.md).

**Bug found and fixed in the same pass**: `TransactionTable.jsx` labeled transaction types with `tx.type === 'transfer-credit' ? 'Credit' : 'Debit'` — a `deposit`-type transaction would have incorrectly displayed as "Debit". Replaced with a proper label map and added "Deposit" to the type filter dropdown. Caught during this session's own live verification, before it ever reached a real user.

**Architectural changes**: none — followed existing patterns exactly, no new decisions about *how* to build it, only *whether* to build it self-service vs. staff-initiated (see below).

**Breaking changes**: none.

**Migrations**: none (additive `Transaction.type` value, schema already supported it).

**Notable decisions**: self-service deposit chosen over staff-initiated, after asking the user directly. Full reasoning in [DECISIONS.md](DECISIONS.md). Known trade-off: no deposit cap, no realism check — documented, not hidden, in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

**Operational note**: this session picked back up after a multi-day gap (previous session: 2026-08-14). The background dev server processes from that session had been torn down, but one orphaned `node.exe` (the bare child process nodemon had spawned, which survived independently of its nodemon supervisor) was still holding port 5050 three days later — a Windows-specific gotcha with this project's dev-server-restart workflow. Identified via `Get-NetTCPConnection`/`Get-Process` and terminated before restarting cleanly. Worth remembering if a future session hits `EADDRINUSE` on a port that *should* be free.

**Result**: the app is now usable end-to-end by a brand-new user with zero manual database intervention — register → deposit → transfer → view history all work through the UI alone. This was the single most important gap standing between "the code works" and "the product works."

## 2026-08-14 (later) — First live verification + admin bootstrap script
**Feature/fix**: Verification, not new features — plus one small utility script.

**Important files**: `server/scripts/seedAdmin.js` (new), `server/package.json` (added `seed:admin` script). Everything else touched this session was documentation.

**What happened**:
- Ran the app for the first time against a real MongoDB instance (local Windows service). Verified the entire Core MVP live: registration, login, account creation, fund transfers (including insufficient-balance rejection and idempotent duplicate-retry protection), transaction history, and all three role dashboards — via both direct API calls and real browser interaction. Full results in [TESTING.md](TESTING.md).
- Built `server/scripts/seedAdmin.js` to promote an existing user to `admin` via CLI, resolving the previous "no admin bootstrap path" gap, and used it to create a real admin for testing.
- Confirmed several previously-theoretical design claims actually hold: idempotent transfer retries don't double-charge, suspending a user takes effect immediately even on an already-issued JWT, and role promotion takes effect immediately even on an already-issued JWT.
- Zero JavaScript errors observed in the browser across the full session.

**Architectural changes**: none — this was verification of the existing design, not new architecture.

**Breaking changes**: none.

**Migrations**: none.

**Notable decisions**: none new — see [DECISIONS.md](DECISIONS.md) for what was reconfirmed.

**New gap found**: there is no way to fund any account — no `deposit` endpoint exists anywhere, so a freshly-registered customer's account is permanently ₹0 unless a developer edits the database directly. This means the core transfer feature is not actually usable end-to-end by a real new user today. This is now the top priority item in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) and [FUTURE_FEATURES.md](FUTURE_FEATURES.md) — arguably more urgent than loans or statements, since it blocks the app's centerpiece feature. A product decision (self-service vs. staff-initiated deposits) is needed before implementing it.

**Other notes**: a user (`dave@example.com`) appeared in the database mid-session that this testing did not create — left untouched, documented in [DEV_CONTEXT.md](DEV_CONTEXT.md) so it isn't mistaken for test fixture data later.

## 2026-08-14 — Initial scaffold + documentation baseline
**Feature/fix**: Project created from scratch.

**Important files**: entire `client/` and `server/` trees (see [ARCHITECTURE.md](ARCHITECTURE.md) for the layout), plus this `/docs` set.

**What was built**:
- Backend: Express API with JWT auth, bcrypt password hashing, role-based access control (customer/employee/admin), MongoDB models (`User`, `Account`, `Transaction`), fund transfer with atomic balance updates + idempotency, transaction history with filter/pagination, admin user management + system report. Security middleware: `helmet`, `cors`, tiered `express-rate-limit`, `express-mongo-sanitize`, `express-validator`.
- Frontend: React 18 + Vite SPA, `AuthContext`-based session management, role-gated routing (`ProtectedRoute`), three dashboards (Customer, Employee, Admin), transfer form, filterable/paginated transaction table, responsive CSS.
- Verified via smoke checks only (deps install cleanly, all backend modules load, `vite build` succeeds) — **not yet run against a live database or in a browser**. See [TESTING.md](TESTING.md).

**Architectural changes**: N/A (initial version). See [DECISIONS.md](DECISIONS.md) for the decisions made while building this first version (MongoDB choice, ledger-style transactions, atomic-update transfer strategy, clientRef idempotency, Core-MVP scope cut).

**Breaking changes**: N/A (initial version).

**Migrations**: none (no data existed before this).

**Notable decisions**: scoped to Core MVP only (auth/accounts/transfers/history/dashboards) — loans, statements, notifications, and bonus features deliberately deferred. Chose `D:\banking-management` as a fresh directory rather than reusing the unrelated pre-existing `D:\banking-app` project. Full reasoning in [DECISIONS.md](DECISIONS.md).

**Known gaps at this checkpoint**: no tests, no git repo yet, no admin bootstrap path, account-closure approval flow incomplete, 4 npm audit findings in `client/`. Full list in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).
