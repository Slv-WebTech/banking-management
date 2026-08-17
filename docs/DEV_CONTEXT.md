# Dev Context

**Read this file first when resuming work on this project — including when the user just says "Continue."**

## Current Objective
The app is now functionally complete for its Core MVP scope and fully usable end-to-end by a brand-new user. Next objective: give it version control (`git init`), then decide what to build next from [PROJECT_PLAN.md](PROJECT_PLAN.md)'s "Next" list.

## Current Development Phase
**Post-verification, feature-complete for Core MVP.** Two live verification passes have happened: 2026-08-14 (auth, accounts, transfers, history, all three dashboards) and 2026-08-16 (self-service deposit, closing the one gap the first pass found). Every implemented feature has been exercised against a real database via both direct API calls and real browser clicks — see [TESTING.md](TESTING.md) for the full log. Nothing is currently a known-broken or known-fake "implemented" claim.

## Current Task
None in progress. Clean checkpoint.

## Recently Completed Work
**2026-08-14**: Scaffolded `server/` and `client/`, built the full `/docs` set, then ran the app live for the first time — verified auth, accounts, transfers (insufficient-balance rejection, successful transfer, idempotent duplicate protection), transaction history, and all three role dashboards, via both curl and real browser interaction. Built `server/scripts/seedAdmin.js` for admin bootstrap. Found one real gap: no way to fund an account.

**2026-08-16** (after a multi-day gap — see "Environment Gotcha" below): Closed that gap with a self-service deposit feature (`POST /api/transactions/deposit`, `DepositForm.jsx`), following the exact same atomic-update + idempotency + ledger pattern already established for transfers. Asked the user first whether deposits should be self-service or staff-initiated (self-service was chosen — see [DECISIONS.md](DECISIONS.md)). Verified live via curl and real browser clicks, including the idempotency and validation paths. **Found and fixed a real bug in the same pass**: `TransactionTable.jsx` was mislabeling `deposit`-type transactions as "Debit" — caught by testing the new feature end-to-end, fixed before it reached a user. Updated all affected docs.

## Files Recently Changed
**2026-08-16**: `server/controllers/transactionController.js` (added `depositFunds`), `server/routes/transactionRoutes.js` (added `POST /deposit`), `client/src/components/DepositForm.jsx` (new), `client/src/pages/CustomerDashboard.jsx` (wired in `DepositForm`), `client/src/components/TransactionTable.jsx` (fixed type-label bug, added Deposit filter option). Everything else this session was documentation.

## Important Implementation Details
- Transfers **and now deposits** use atomic single-document conditional updates (not multi-doc transactions) — see [ARCHITECTURE.md](ARCHITECTURE.md) and [DECISIONS.md](DECISIONS.md) before touching `server/controllers/transactionController.js`. Confirmed correct live for sequential requests including idempotent retries, on both money-movement paths.
- Every route handler must be wrapped in `utils/asyncHandler.js` — unwrapped async controllers will crash the process on a thrown error instead of reaching `errorHandler`.
- `Transaction` documents are ledger entries. Transfers produce **two** (debit + credit, sharing a `reference`); deposits produce **one** (no `counterpartyAccount`). If you add a new transaction-producing feature (e.g. withdrawal), follow whichever shape actually fits — don't force a two-document pattern where one suffices, and don't reuse this note as justification to skip the `reference`/`clientRef`/`balanceAfter` fields that both existing patterns share.
- **When adding any new UI element that displays `tx.type`**, check `client/src/components/TransactionTable.jsx`'s `TYPE_LABELS` map — it needs an entry for every value in the `Transaction.type` enum, or new types will silently fall through to displaying the raw enum string (better than the old mislabel-as-Debit bug, but still worth keeping the map complete).
- Suspending a user via the admin panel takes effect immediately (next request) — confirmed live: a suspended user's pre-existing JWT was rejected (401) on the very next call. `protect()` checks the live DB role/status every request, not the JWT's baked-in claims.

## Known Issues
See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for the full ranked list. Top items now: no automated tests (though core flows are manually verified twice over), no multi-document transaction guarantee for money movement, not yet a git repository, self-service deposit has no cap (a documented trade-off, not a bug), account-closure approval flow incomplete.

## Environment Gotcha: Orphaned Dev-Server Processes
On 2026-08-16, resuming after a multi-day gap, the backend port (5050) was still occupied — not by something new, but by an orphaned `node.exe` left over from the 2026-08-14 session. On Windows, `nodemon`'s child `node` process can survive independently of its supervisor being killed. If a future session hits an unexpected `EADDRINUSE` on a port that should be free, check `Get-NetTCPConnection -LocalPort <port> -State Listen` → `Get-Process -Id <pid>` for a stale process (matching an old `StartTime`) before assuming something else claimed the port.

## A Note On Shared Local State
The database has accumulated test fixtures across sessions: `alice.test@example.com`, `bob.test@example.com`, `admin.test@example.com` (admin), `employee.test@example.com` (employee), `carol.browser@example.com` — all known, all fine to keep using. **`dave@example.com`** ("Dave Recruiter") appeared during the 2026-08-14 session without this project's testing creating it — still unexplained, still untouched. Don't assume it's safe to delete or that it's definitely test data.

## Current Blockers
None. Deployment remains blocked on the user providing hosting/database credentials, but nothing else is blocked.

## Decisions Made Recently
Full log in [DECISIONS.md](DECISIONS.md). Most recent: self-service deposit over staff-initiated (2026-08-16) — a deliberate simplicity-over-realism trade-off, made after asking the user directly, not assumed.

## Things That Must NOT Be Changed Without Discussion
- **The documentation-first protocol itself**: per explicit user instruction, do not implement/modify/refactor/extend project code without first inspecting existing code and keeping `/docs` current. Before any substantial feature: understand → plan → check consistency against `/docs` → implement → verify → document. This is a standing rule for this project, not a one-time request.
- **Scope discipline**: don't build loans/statements/notifications/bonus features "while you're in there" — they're deliberately deferred. If live testing surfaces another gap as urgent as the funding one was, it's fine to raise it proactively, but still ask before implementing — that's what happened with deposit, and it worked well.
- **The atomic-update strategy for money movement** (transfers and deposits both) — don't silently "upgrade" this to multi-document transactions without flagging that it now requires a MongoDB replica set (an infrastructure change, not just a code change).
- **Don't run destructive/irreversible commands** (`git init` + first commit, deployment, `npm audit fix --force`) without confirming with the user first.
- **Don't touch `dave@example.com`** or assume it's test data to clean up.

## Next Recommended Action
`git init` this project (ask first — it's flagged as a "Next" item, not yet executed) so the current fully-working state has version history before anything else changes. After that, the next highest-value items are either automated tests (there's now two rounds of manual verification to convert into real test cases) or the staff account-closure approval endpoint — either is reasonable; ask the user which they'd rather see next rather than assuming.

## Commands

### Run the project
```
# Terminal 1
cd server && npm run dev      # http://localhost:5000 by default (this project's sessions have used 5050 — see below)

# Terminal 2
cd client && npm run dev      # http://localhost:5173 by default (this project's sessions have used 5175, then 5178 — see below)
```
Requires `server/.env` (copy from `.env.example`) with a real `MONGO_URI`. **Port note**: on the machine this has been tested on, the default ports keep being occupied by unrelated processes — every session so far has needed a non-default `PORT` in `server/.env` and has had to update `CLIENT_URL` to match whatever port Vite actually lands on. Check what's actually running (`netstat -ano | Select-String ":<port> "` in PowerShell) rather than assuming the defaults are free — and see "Environment Gotcha" above before assuming an occupied port means something unrelated is using it.

### Bootstrap an admin
```
cd server && npm run seed:admin -- someone@example.com
```
(User must already be registered.)

### Build
```
cd client && npm run build    # production build to client/dist
```

### Test
None automated yet — see [TESTING.md](TESTING.md) for what's been manually verified instead (twice now).

### Deploy
Not set up — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Environment Requirements
- Node.js 18+
- MongoDB reachable via `MONGO_URI` — confirmed working against a local Windows MongoDB service across multiple sessions, including surviving multi-day gaps between them.
- `server/.env` and `client/.env` populated from their `.env.example` files (both exist locally now but remain gitignored — a fresh clone still needs to recreate them, and a fresh session on this same machine should double-check the port values still match what's actually free).
