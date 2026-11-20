# Dev Context

**Read this file first when resuming work on this project — including when the user just says "Continue."**

## Current Objective
The app is functionally complete for its Core MVP scope plus loan management, staff closure approval, broader transaction search, customer-initiated account closure, a full visual redesign, and the **Verdant Bank** identity (logo, favicon, README, social preview). It has been **live-tested in a real browser against a real MongoDB** for all three roles, security-reviewed and QA-hardened (see [QA-REPORT.md](QA-REPORT.md)), and has 108 server + 28 client automated tests plus CI. No objective is currently in flight. Two open items need a **product decision**, not engineering: the self-service deposit model (QA B5) and loan maker-checker policy (QA B7).

## Current Development Phase
**Post-QA-hardening, pre-deployment (2026-11-20).** History: live verification passes on 2026-08-14 (Core MVP) and 2026-08-16 (deposits); automated suites added 2026-08-17; redesign + loans + closure approval + search shipped 2026-08-22; a security/review hardening pass landed 2026-11-19; and on **2026-11-20 a full senior-QA pass** exercised every flow live in Chrome (customer, employee, admin), attacked the API (76-check black-box battery), measured performance at 60k transactions, and fixed what it found. Result: 108 server tests (8 files) + 28 client tests (5 files) pass, the production build succeeds, and the remaining open items are listed in [QA-REPORT.md](QA-REPORT.md) and [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md). Not deployed anywhere yet.

## Recent Work (2026-11-20)
- **Live QA**: customer/employee/admin flows, responsive layouts (375/768/1280), keyboard and contrast checks, console/network review — [QA-REPORT.md](QA-REPORT.md).
- **Fixes**: balance float drift (`adjustBalance` in `server/utils/money.js`), 500s on malformed input (Cast/Validation errors now 400), login timing oracle, stack-trace leak when `NODE_ENV` is unset, month-end loan due dates, per-user rate limits, pending-loan cap, `?page`/`?limit` + `X-Total-Count` on staff lists, new indexes, debounced searches, route code-splitting, customer "Request closure" button, accessibility and mobile-ergonomics fixes.
- **Identity**: tagline "Calm money, clearly kept.", logo/banner/favicon/social preview in `docs/assets/` and `client/public/`, rewritten `README.md`.
- **Note**: use the `github-personal` SSH alias for git remotes (see below).

## Current Task
None in progress. Clean checkpoint.

## Recently Completed Work
**2026-08-14**: Scaffolded `server/` and `client/`, built the full `/docs` set, ran the app live for the first time (auth, accounts, transfers, history, all three dashboards — API + browser). Built `server/scripts/seedAdmin.js`. Found one real gap: no way to fund an account.

**2026-08-16** (after a multi-day gap — see "Environment Gotcha" below): Closed that gap with self-service deposit (`POST /api/transactions/deposit`, `DepositForm.jsx`), following the transfer pattern exactly. Verified live. Found and fixed a real bug in the same pass: `TransactionTable.jsx` mislabeled deposits as "Debit."

**2026-08-17**: Three things, in order:
1. `git init` + first commit + push to `github.com/Slv-WebTech/banking-management` (private), using the personal SSH identity.
2. **Fixed the commit's identity** on request: the first commit had author "VivekLZT" (the machine's generic git identity) and a "Co-Authored-By: Claude" trailer. Amended to `Slv-WebTech <70682890+Slv-WebTech@users.noreply.github.com>` for both author and committer (via `--author` + one-off `GIT_COMMITTER_*` env vars — **not** `git config`, which this project's rules never touch), dropped the Claude trailer, and force-pushed (`--force-with-lease`) to `main` after explicit confirmation.
3. **Built the automated test suite** (user's explicit choice): Jest + Supertest + `mongodb-memory-server` for `server/` (32 tests), Vitest + React Testing Library for `client/` (21 tests). Required splitting `server.js` into `app.js` (side-effect-free Express app) + a thin `server.js` entry point so Supertest could import the app without a real DB connection or port bind — verified the live dev server still worked correctly after that refactor before moving on.

**2026-08-22**: Two large pieces of work, pushed as two separate commits to `main`:
1. **Full UI/UX redesign** — new design-token CSS system (`client/src/index.css`), new reusable component set (`client/src/components/ui/`: Icon, Button, Badge, Spinner, EmptyState, Skeleton), every page/component rebuilt on top of it, full-bleed split-screen auth flow, dark "bank card" account cards. Caught and fixed one real bug during the redesign itself (a global heading-color rule made the auth headline nearly invisible on the dark panel). Built via 5 parallel forked subagents, each owning a disjoint set of files against a fixed design-system contract, since the user asked for parallel/fast execution.
2. **Three new features, backend-first then frontend**: staff account-closure approval, broader transaction search (description/counterparty-account match, not just `reference`), and loan management (new `Loan` model, independently unit-tested EMI/amortization math in `server/utils/loanSchedule.js`, full apply→approve/reject→repay flow). The EMI math was built and unit-tested (13 tests, hand-derived exact values) *before* any controller code depended on it, given it was flagged in [FUTURE_FEATURES.md](FUTURE_FEATURES.md) as needing careful testing. Backend shipped as its own commit (66 server tests passing) before the frontend (customer `/loans` page, staff review queues) shipped as a second commit.
3. **Rename to Verdant Bank** — the product name changed (ties to the redesign's emerald color identity); the GitHub repo slug/URL was deliberately kept as `banking-management`. Done via a `rebrand-verdant-bank` branch + PR + merge (rather than direct-to-main push), per explicit request. See [DECISIONS.md](DECISIONS.md).

## Files Recently Changed
**2026-08-17**: `server/app.js` (new), `server/server.js` (thinned to an entry point), `server/jest.config.js` (new), `server/tests/*` (new — `setup.js`, `helpers.js`, 4 test files), `server/routes/authRoutes.js` + `transactionRoutes.js` (rate limiters skip under `NODE_ENV=test`), `client/vite.config.js` (test config), `client/src/test/setup.js` (new), 4 new `client/src/**/*.test.jsx` files.

**2026-08-22**: Every file under `client/src/` (redesign) plus: `server/models/Loan.js` (new), `server/utils/loanSchedule.js` (new), `server/controllers/loanController.js` (new), `server/routes/loanRoutes.js` (new), `server/models/Transaction.js` (`type` enum gained `loan-disbursement`/`loan-repayment`), `server/controllers/accountController.js` (`approveClosure`/`rejectClosure`), `server/controllers/transactionController.js` (unified, broader `buildHistoryFilter`), `server/tests/loanSchedule.test.js` + `loans.test.js` (new), additions to `server/tests/accounts.test.js` + `transactions.test.js`, `.github/workflows/ci.yml` (new), `client/src/pages/CustomerLoans.jsx` (new), and a full pass across every file in `/docs` plus the root `README.md` for the rename and factual sync.

## Important Implementation Details
- Transfers **and** deposits use atomic single-document conditional updates (not multi-doc transactions) — see [ARCHITECTURE.md](ARCHITECTURE.md) and [DECISIONS.md](DECISIONS.md) before touching `server/controllers/transactionController.js`. Confirmed correct for sequential requests including idempotent retries, both manually and now by `server/tests/transactions.test.js`.
- **`server/app.js` vs `server/server.js`**: `app.js` must stay side-effect-free (no `connectDB()`, no `app.listen()`) — that's what makes it importable by tests. Any new middleware/route mounting belongs in `app.js`, not `server.js`.
- Every route handler must be wrapped in `utils/asyncHandler.js` — unwrapped async controllers will crash the process on a thrown error instead of reaching `errorHandler`.
- `Transaction` documents are ledger entries. Transfers produce **two** (debit + credit, sharing a `reference`); deposits produce **one** (no `counterpartyAccount`).
- **When adding any new UI element that displays `tx.type`**, check `client/src/components/TransactionTable.jsx`'s `TYPE_LABELS` map (plus `TYPE_ICONS` and `amountClass()`) — each needs an entry for every value in the `Transaction.type` enum (now 6 values, including `loan-disbursement`/`loan-repayment` added 2026-08-22). There's a regression test (`TransactionTable.test.jsx`) guarding the original mistake class; keep it in sync with the maps.
- **Loan EMI/amortization math lives in `server/utils/loanSchedule.js`**, deliberately a pure-function module with zero DB/Express dependencies so it can be unit-tested in isolation (`server/tests/loanSchedule.test.js`, 13 tests). Don't inline schedule-calculation logic into `loanController.js` — keep the math testable on its own, matching how this file was built (math + tests written and passing *before* the controller that uses it).
- **Loan interest rate is a staff decision at approval time**, not something the customer chooses when applying — see [DECISIONS.md](DECISIONS.md) before changing the apply/approve request shapes.
- Suspending/promoting a user takes effect immediately (next request), even on an already-issued JWT — `protect()` checks the live DB role/status every request. Confirmed live and now covered by `server/tests/admin.test.js`.
- **Test env details**: `NODE_ENV=test` (set by the `test` npm scripts) makes the rate limiters skip themselves, and each backend test *file* gets its own `mongodb-memory-server` instance via `setupFilesAfterEnv` — don't assume state persists between test files. Frontend tests mock `src/api/axios.js` — never let a test hit a real network call.
- **This project's remote git operations must always use the `github-personal` SSH host alias**, never bare `github.com` (which resolves to a different, work identity on this machine) — check `~/.ssh/config` directly if unsure.

## Known Issues
See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) and [QA-REPORT.md](QA-REPORT.md) for the full ranked list. Top items now: self-service deposits create money with no funding source (product decision, QA B5); no maker-checker policy beyond "not your own" on loan review (QA B7); balances are stored as doubles rounded to cents inside each atomic update (a mitigation — integer minor units would remove the class of bug); money movement is atomic per leg with compensating writes, not a multi-document transaction; deep `skip()` pagination and case-insensitive regex search will need cursor pagination / a text index at ~1M rows; 4 client npm audit findings in dev dependencies; no structured logging; no ESLint/Prettier; no e2e tests.

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
- **Scope discipline**: don't build statements/notifications/bonus features "while you're in there." Proactively raising a genuinely urgent gap (like the funding one, historically) is fine — implementing it without asking first is not. (Loan management was explicitly requested and shipped 2026-08-22 — this rule is about unprompted scope creep, not a standing ban on ever building deferred features.)
- **The atomic-update strategy for money movement** — don't silently "upgrade" to multi-document transactions without flagging the replica-set requirement that comes with it.
- **`server/app.js` must stay side-effect-free.** Don't add `connectDB()`/`app.listen()` calls to it, or the test suite breaks.
- **Git remote for this project**: always `github-personal`, never bare `github.com`. Never force-push without explicit confirmation each time — the 2026-08-17 amend was a one-time, asked-for exception, not a standing permission.
- **Don't touch `dave@example.com`** in the local database.
- Deployment, `npm audit fix --force`, and other destructive/irreversible commands still need confirmation first.

## Next Recommended Action
Ask the user which "Next" item from [PROJECT_PLAN.md](PROJECT_PLAN.md) to tackle. Highest value now: decide the deposit/funding model (QA B5) and the loan approval policy (QA B7), then add Playwright smoke tests for the three roles. Don't assume — the user chose the last several priorities explicitly.

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
cd server && npm test    # Jest + Supertest, 108 tests across 8 files, ~2 min (each test file starts its own in-memory MongoDB)
cd client && npm test    # Vitest + React Testing Library, 28 tests across 5 files
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
