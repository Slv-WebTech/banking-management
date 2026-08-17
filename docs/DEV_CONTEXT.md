# Dev Context

**Read this file first when resuming work on this project — including when the user just says "Continue."**

## Current Objective
The app is functionally complete for its Core MVP scope, fully usable end-to-end by a brand-new user, has version control with a remote backup, and now has real regression protection for its highest-risk logic. No objective is currently in flight — pick the next item from [PROJECT_PLAN.md](PROJECT_PLAN.md)'s "Next" list (CI is first in line, since a test suite now exists for it to run).

## Current Development Phase
**Post-verification, post-test-suite.** Three live verification passes happened before any automated tests existed: 2026-08-14 (Core MVP), 2026-08-16 (deposit feature). Then on 2026-08-17, an automated test suite was built (53 tests) covering the flows those manual passes had already proven out by hand — see [TESTING.md](TESTING.md) for exactly what's covered and what still isn't. Nothing is currently a known-broken or known-fake "implemented" claim.

## Current Task
None in progress. Clean checkpoint.

## Recently Completed Work
**2026-08-14**: Scaffolded `server/` and `client/`, built the full `/docs` set, ran the app live for the first time (auth, accounts, transfers, history, all three dashboards — API + browser). Built `server/scripts/seedAdmin.js`. Found one real gap: no way to fund an account.

**2026-08-16** (after a multi-day gap — see "Environment Gotcha" below): Closed that gap with self-service deposit (`POST /api/transactions/deposit`, `DepositForm.jsx`), following the transfer pattern exactly. Verified live. Found and fixed a real bug in the same pass: `TransactionTable.jsx` mislabeled deposits as "Debit."

**2026-08-17**: Three things, in order:
1. `git init` + first commit + push to `github.com/Slv-WebTech/banking-management` (private), using the personal SSH identity.
2. **Fixed the commit's identity** on request: the first commit had author "VivekLZT" (the machine's generic git identity) and a "Co-Authored-By: Claude" trailer. Amended to `Slv-WebTech <70682890+Slv-WebTech@users.noreply.github.com>` for both author and committer (via `--author` + one-off `GIT_COMMITTER_*` env vars — **not** `git config`, which this project's rules never touch), dropped the Claude trailer, and force-pushed (`--force-with-lease`) to `main` after explicit confirmation.
3. **Built the automated test suite** (user's explicit choice): Jest + Supertest + `mongodb-memory-server` for `server/` (32 tests), Vitest + React Testing Library for `client/` (21 tests). Required splitting `server.js` into `app.js` (side-effect-free Express app) + a thin `server.js` entry point so Supertest could import the app without a real DB connection or port bind — verified the live dev server still worked correctly after that refactor before moving on.

## Files Recently Changed
**2026-08-17**: `server/app.js` (new), `server/server.js` (thinned to an entry point), `server/jest.config.js` (new), `server/tests/*` (new — `setup.js`, `helpers.js`, 4 test files), `server/routes/authRoutes.js` + `transactionRoutes.js` (rate limiters skip under `NODE_ENV=test`), `client/vite.config.js` (test config), `client/src/test/setup.js` (new), 4 new `client/src/**/*.test.jsx` files. Everything else this session was documentation, plus the git history amend described above.

## Important Implementation Details
- Transfers **and** deposits use atomic single-document conditional updates (not multi-doc transactions) — see [ARCHITECTURE.md](ARCHITECTURE.md) and [DECISIONS.md](DECISIONS.md) before touching `server/controllers/transactionController.js`. Confirmed correct for sequential requests including idempotent retries, both manually and now by `server/tests/transactions.test.js`.
- **`server/app.js` vs `server/server.js`**: `app.js` must stay side-effect-free (no `connectDB()`, no `app.listen()`) — that's what makes it importable by tests. Any new middleware/route mounting belongs in `app.js`, not `server.js`.
- Every route handler must be wrapped in `utils/asyncHandler.js` — unwrapped async controllers will crash the process on a thrown error instead of reaching `errorHandler`.
- `Transaction` documents are ledger entries. Transfers produce **two** (debit + credit, sharing a `reference`); deposits produce **one** (no `counterpartyAccount`).
- **When adding any new UI element that displays `tx.type`**, check `client/src/components/TransactionTable.jsx`'s `TYPE_LABELS` map — it needs an entry for every value in the `Transaction.type` enum. There's now a regression test (`TransactionTable.test.jsx`) guarding this specific mistake class; keep it in sync with the map.
- Suspending/promoting a user takes effect immediately (next request), even on an already-issued JWT — `protect()` checks the live DB role/status every request. Confirmed live and now covered by `server/tests/admin.test.js`.
- **Test env details**: `NODE_ENV=test` (set by the `test` npm scripts) makes the rate limiters skip themselves, and each backend test *file* gets its own `mongodb-memory-server` instance via `setupFilesAfterEnv` — don't assume state persists between test files. Frontend tests mock `src/api/axios.js` — never let a test hit a real network call.
- **This project's remote git operations must always use the `github-personal` SSH host alias**, never bare `github.com` (which resolves to a different, work identity on this machine) — check `~/.ssh/config` directly if unsure.

## Known Issues
See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for the full ranked list. Top items now: no CI (a test suite exists but nothing runs it automatically), real gaps in what the test suite covers (`TransferForm.jsx`, page components, no coverage reporting, no e2e), no multi-document transaction guarantee for money movement (covered by tests for the sequential case, not load-tested for true concurrency), self-service deposit has no cap (a documented trade-off), account-closure approval flow incomplete.

## Environment Gotcha: Orphaned Dev-Server Processes
On 2026-08-16 and again on 2026-08-17, resuming after a gap, backend/frontend ports were still occupied by orphaned `node.exe` processes left over from the previous session — `nodemon`'s child process survives independently of its supervisor being killed, on Windows. If a future session hits an unexpected `EADDRINUSE`, check `Get-NetTCPConnection -LocalPort <port> -State Listen` → `Get-Process -Id <pid>` for a stale process (matching an old `StartTime`) before assuming something else claimed the port. Sometimes the "orphan" is actually still healthy and serving correctly (confirmed via `curl` before deciding whether to restart) — don't assume killing and restarting is always necessary.

## A Note On Shared Local State
The database has accumulated test fixtures across sessions: `alice.test@example.com`, `bob.test@example.com`, `admin.test@example.com` (admin), `employee.test@example.com` (employee), `carol.browser@example.com` — all known, all fine to keep using. **`dave@example.com`** ("Dave Recruiter") appeared during the 2026-08-14 session without this project's testing creating it — still unexplained, still untouched. Don't assume it's safe to delete or that it's definitely test data. (This is about the local MongoDB database only — unrelated to the automated test suite, which uses fully isolated in-memory databases and never touches this local data.)

## Current Blockers
None. Deployment remains blocked on the user providing hosting/database credentials.

## Decisions Made Recently
Full log in [DECISIONS.md](DECISIONS.md). Most recent substantive one: self-service deposit over staff-initiated (2026-08-16). The 2026-08-17 test-suite work involved implementation choices (per-file in-memory MongoDB instances, rate-limiter test-skip) but no new product/architecture decisions warranting a DECISIONS.md entry — see [TESTING.md](TESTING.md) instead for that reasoning.

## Things That Must NOT Be Changed Without Discussion
- **The documentation-first protocol itself**: per explicit user instruction, do not implement/modify/refactor/extend project code without first inspecting existing code and keeping `/docs` current. Before any substantial feature: understand → plan → check consistency against `/docs` → implement → verify → document.
- **Scope discipline**: don't build loans/statements/notifications/bonus features "while you're in there." Proactively raising a genuinely urgent gap (like the funding one) is fine — implementing it without asking first is not.
- **The atomic-update strategy for money movement** — don't silently "upgrade" to multi-document transactions without flagging the replica-set requirement that comes with it.
- **`server/app.js` must stay side-effect-free.** Don't add `connectDB()`/`app.listen()` calls to it, or the test suite breaks.
- **Git remote for this project**: always `github-personal`, never bare `github.com`. Never force-push without explicit confirmation each time — the 2026-08-17 amend was a one-time, asked-for exception, not a standing permission.
- **Don't touch `dave@example.com`** in the local database.
- Deployment, `npm audit fix --force`, and other destructive/irreversible commands still need confirmation first.

## Next Recommended Action
Ask the user which "Next" item from [PROJECT_PLAN.md](PROJECT_PLAN.md) to tackle: CI pipeline (now genuinely actionable), the staff account-closure endpoint, or filling the test-suite gaps (`TransferForm.jsx` especially). Don't assume — the pattern this project has followed is to ask before picking, every time.

## Commands

### Run the project
```
# Terminal 1
cd server && npm run dev      # http://localhost:5000 by default (this project's sessions have needed 5050 — see below)

# Terminal 2
cd client && npm run dev      # http://localhost:5173 by default (this project's sessions have landed on 5175, then 5178 — see below)
```
Requires `server/.env` (copy from `.env.example`) with a real `MONGO_URI`. **Port note**: default ports keep being occupied by unrelated processes on this machine — check what's actually running (`netstat -ano | Select-String ":<port> "` in PowerShell) rather than assuming defaults are free, and see "Environment Gotcha" above.

### Bootstrap an admin
```
cd server && npm run seed:admin -- someone@example.com
```

### Test
```
cd server && npm test    # Jest + Supertest, ~70s (each test file starts its own in-memory MongoDB)
cd client && npm test    # Vitest + React Testing Library
```
See [TESTING.md](TESTING.md) for exact coverage and known gaps.

### Build
```
cd client && npm run build    # production build to client/dist
```

### Deploy
Not set up — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Environment Requirements
- Node.js 18+
- MongoDB reachable via `MONGO_URI` for running the *app* (the automated test suite needs no external MongoDB — `mongodb-memory-server` handles that itself, downloading a binary on first run if not already cached).
- `server/.env` and `client/.env` populated from their `.env.example` files (gitignored — a fresh clone needs to recreate them).
