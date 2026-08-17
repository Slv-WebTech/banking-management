# Testing

## Current State: Automated Test Suite Exists (2026-08-17)
`server/` has Jest + Supertest + `mongodb-memory-server` (32 tests, 4 files). `client/` has Vitest + React Testing Library (21 tests, 4 files). Both suites pass. Everything below the "Automated Tests" section is the manual-verification history that seeded what these tests cover — kept for the record, not because it's still the only evidence.

## Automated Tests

### Backend — `server/` (`npm test`)
Jest + Supertest against the real Express `app` (imported from `server/app.js`, which has no side effects — see [ARCHITECTURE.md](ARCHITECTURE.md)), with `mongodb-memory-server` providing a fresh isolated MongoDB instance per test file (via `setupFilesAfterEnv`, see `server/tests/setup.js`). Rate limiters skip themselves under `NODE_ENV=test` (set by the `test` npm script) so fast test loops don't trip them. Run: `cd server && npm test`.

| File | Covers |
|---|---|
| `tests/auth.test.js` | register (success, duplicate email, weak password), login (success, wrong password, unknown email), `/me` (no token, valid token), **suspended user rejected immediately even with a still-valid token** |
| `tests/accounts.test.js` | open account (unique number, zero balance), `GET /accounts/mine` scoping, ownership check on `GET /accounts/:id`, role check on `GET /accounts/all`, closure request (rejected with balance, accepted at zero) |
| `tests/transactions.test.js` | **deposit**: success, validation rejection, idempotent duplicate; **transfer**: insufficient-balance rejection (source untouched), successful transfer with matching ledger pair (shared `reference`, correct `balanceAfter` on both legs), idempotent duplicate, nonexistent-recipient rejection, same-account rejection, ownership check; **history**: pagination (`page`/`limit`/`pages` math), `type` filter |
| `tests/admin.test.js` | non-admin blocked from admin routes, **role promotion takes effect on a pre-promotion token**, **suspension rejects a pre-suspension token immediately**, report accuracy against real seeded data, user search/role filters |

`tests/helpers.js` provides `registerUser`, `openAccount`, `deposit`, and `createUserWithRole` (promotes a freshly-registered user via a direct DB write, mirroring `scripts/seedAdmin.js`, and deliberately returns the *original* pre-promotion token so tests exercise the live-DB-check behavior rather than working around it).

### Frontend — `client/` (`npm test`)
Vitest + React Testing Library + `@testing-library/user-event`, jsdom environment. `src/api/axios.js` is mocked (`vi.mock`) in every test that touches it — no real network calls. Run: `cd client && npm test`.

| File | Covers |
|---|---|
| `src/context/AuthContext.test.jsx` | no-token startup (no API call made), session restore from `/me`, failed restore clears storage, `login()` persists token/user and updates state, `logout()` clears everything |
| `src/components/ProtectedRoute.test.jsx` | loading state, redirect to `/login` when logged out, redirect to `/` on role mismatch, renders children on role match and on no-roles-required |
| `src/components/TransactionTable.test.jsx` | empty state, **regression test for the type-label bug**: debit/credit/deposit all render their correct distinct label (would have failed under the old `tx.type === 'transfer-credit' ? 'Credit' : 'Debit'` logic), ₹ number formatting, conditional Account column, pagination button disabled-states and click behavior, filter `onChange` wiring |
| `src/components/DepositForm.test.jsx` | account list rendering, submit disabled with no accounts, successful submit (correct payload shape, `clientRef` present, success message, form clears, callback fires), failed submit (server error message shown, form *not* cleared) |

## Known Gaps In The Automated Suite (honest, not padded)
- No tests for `TransferForm.jsx`, `Login.jsx`/`Register.jsx` pages, `CustomerDashboard.jsx`/`EmployeeDashboard.jsx`/`AdminDashboard.jsx` data-fetching orchestration, `AccountCard.jsx`, or `Navbar.jsx` — the highest-risk logic (money movement, auth, the type-label bug class) is covered; page-level composition and simpler presentational components are not yet.
- No e2e tests (Playwright) — nothing exercises the real browser + real running servers together the way the manual sessions did. That manual coverage (see below) is not yet fully replaced.
- No coverage reporting configured (no `--coverage` in either `test` script) — "32 backend / 21 frontend tests pass" is not the same claim as "X% of lines are covered." Don't conflate the two.
- No CI — these tests only run when someone remembers to run them locally. See [PROJECT_PLAN.md](PROJECT_PLAN.md).
- Backend suite takes ~70s (each of the 4 test files spins up its own `mongodb-memory-server` instance via `setupFilesAfterEnv`, run serially via `--runInBand`) — slow enough to be worth knowing about, not slow enough to have needed optimizing yet.

## Manual Verification History (superseded as the *only* evidence, kept for the record)
The app was also run end-to-end live, against a real local MongoDB instance, on two occasions before the automated suite existed — **2026-08-14** (initial verification of the Core MVP) and **2026-08-16** (verification of the self-service deposit feature, added specifically to close the funding gap found on the 14th). This section records exactly what was verified and how, so nothing here is a guess.

## Environment This Was Verified In
- MongoDB: local Windows service (`MongoDB Server`), already installed, reachable at `127.0.0.1:27017`. Confirmed still running and holding all prior test data across the multi-day gap between the two sessions.
- Backend: `http://localhost:5050` both sessions (not 5000 — an unrelated process already had 5000 on this machine; see `server/.env`, which is gitignored and machine-specific. `.env.example` still documents 5000 as the conventional default).
- Frontend: `http://localhost:5175` on 2026-08-14, `http://localhost:5178` on 2026-08-16 (Vite auto-increments past whatever's already taken on this machine — ports 5173-5177 were all occupied the second time). `server/.env`'s `CLIENT_URL` was updated to match each time, or CORS rejects the frontend's requests.
- **Operational gotcha found 2026-08-16**: after the multi-day gap, port 5050 was still occupied — not by something else, but by an orphaned `node.exe` left over from the 2026-08-14 session (nodemon's child process survives independently of its supervisor on Windows; killing the supervisor doesn't kill the child). Identified via `Get-NetTCPConnection`/`Get-Process` (matching start timestamp confirmed it was the old process) and terminated before restarting. Worth checking for first if a future session hits an unexpected `EADDRINUSE`.

## What Was Verified — API Level (curl against the running server)
| Flow | Result | Session |
|---|---|---|
| Register (2+ customers) | 201, JWT returned, persisted in MongoDB | 08-14 |
| Login | 200, JWT returned | 08-14 |
| Open account (Savings + Current) | 201, unique account numbers generated, balance 0 | 08-14 |
| Transfer with insufficient balance | **Correctly rejected**, 400, source account untouched | 08-14 |
| Transfer with sufficient balance | 201, correct `balanceAfter` on the debit leg | 08-14 |
| Idempotent transfer retry (same `clientRef`) | **Correctly returned the original transaction**, 200, no double-debit | 08-14 |
| Credit leg | Destination balance and ledger entry correct, same `reference` as the debit leg | 08-14 |
| `GET /transactions/mine` (both parties) | Correct ledger entries, correct `counterpartyAccount` population | 08-14 |
| Role check: customer hits `/accounts/all` | Correctly rejected, 403 | 08-14 |
| Ownership check: customer views another customer's account by id | Correctly rejected, 403 | 08-14 |
| No token | Correctly rejected, 401 | 08-14 |
| Admin report (`GET /admin/report`) | Correct aggregate counts/totals, matched hand-calculated values | 08-14 |
| Role promotion via `PATCH /admin/users/:id/role` | Took effect immediately on next request, even with a pre-promotion JWT | 08-14 |
| Suspend, then retry with the user's old token | Correctly rejected, 401, immediately | 08-14 |
| **Deposit with positive amount** | **201, correct `balanceAfter`, single ledger entry with `type: 'deposit'`** | **08-16** |
| **Idempotent deposit retry (same `clientRef`)** | **Correctly returned the original transaction**, 200, no double-deposit — balance confirmed unchanged on retry | **08-16** |
| **Deposit with negative amount** | **Correctly rejected**, 400, `express-validator` message | **08-16** |

## What Was Verified — Browser Level (real clicks against the real UI)
All three roles were driven through the actual rendered app (not just the API):
- **Register → Customer Dashboard**: form submission, redirect, empty-state message all correct. *(08-14)*
- **Open account**: account card renders with correct balance/type/status/account number formatting. *(08-14)*
- **Transfer, insufficient balance**: the exact `.error-text` message from the API rendered correctly in the form. *(08-14)*
- **Transfer, successful**: balance updated in the account card, transaction history table auto-refreshed with the new row, form cleared — all without a page reload. *(08-14)*
- **Cross-account transfer visible from both sides**: logged in as the recipient separately and confirmed the credited balance and ledger entry. *(08-14)*
- **Employee Dashboard**: customer account list and cross-account transaction history rendered correctly with real multi-user data; account-number search filter narrowed results correctly. *(08-14)*
- **Admin Dashboard**: stat cards showed correct live counts/totals; Suspend/Activate button toggled a real user's status and label instantly; role-change dropdown persisted a real role change. *(08-14)*
- **Deposit, successful**: `.success-text` "Deposit successful" message rendered, account balance and dropdown both updated immediately, transaction history auto-refreshed. *(08-16)*
- **Deposit transaction displays correctly in history**: showed as "Deposit" (not mislabeled as "Debit" — see the bug note below), and the type filter's new "Deposit" option correctly narrowed the table to just deposit rows. *(08-16)*
- **Console check**: zero *application* JavaScript errors across both sessions. 2026-08-14 showed two harmless React Router v6 "future flag" warnings on initial load. 2026-08-16 showed three "Could not establish connection" errors, but these were Chrome-extension messaging noise from the tab reconnecting after the multi-day gap (all timestamped before the app even mounted) — not app bugs.

## Real Bugs/Gaps Found By This Verification
1. **~~No way for any account to receive its first unit of money~~** — found 2026-08-14, **resolved 2026-08-16** via self-service deposit. See [DECISIONS.md](DECISIONS.md) and [IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md). This was invisible until an actual end-to-end run was attempted — exactly the kind of thing "the code loads without errors" cannot catch.
2. **`TransactionTable.jsx` mislabeled `deposit`-type transactions as "Debit"** — found and fixed within the same 2026-08-16 session that introduced the `deposit` type, before it ever reached a real user. The old logic (`tx.type === 'transfer-credit' ? 'Credit' : 'Debit'`) treated anything that wasn't specifically a transfer-credit as a debit. Caught by testing the new feature end-to-end rather than just confirming the API worked in isolation.

## Test Data Left In The Database
The local `banking-management` database now contains, cumulatively: `alice.test@example.com`, `bob.test@example.com`, `admin.test@example.com` (role: admin), `employee.test@example.com` (role: employee), `carol.browser@example.com` — all known test fixtures, not cleaned up since the plan is to keep using this same local database. **`dave@example.com` ("Dave Recruiter")** also appeared during the 2026-08-14 session without being created by that session's testing — still unexplained, still left untouched. See [DEV_CONTEXT.md](DEV_CONTEXT.md).

## Still Not Verified (by manual testing *or* the automated suite)
- Concurrent/simultaneous transfers or deposits against the same account — atomicity is confirmed correct for *sequential* requests including retried duplicates (both manually and now by `transactions.test.js`), but nothing has load-tested true concurrent requests hitting the same account at once.
- Account closure request/approval flow (still incomplete — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).
- Mobile/responsive layout in an actual narrow viewport.
- Anything under `client/dist` production build served for real (only `vite build`'s exit code has been checked, not the built output running).
- `TransferForm.jsx`, the page components, and simpler presentational components — see "Known Gaps In The Automated Suite" above.

*(Pagination beyond a single page is no longer on this list — `transactions.test.js` now covers `page`/`limit`/`pages` math directly.)*

## Recommended Next Steps
In priority order: (1) coverage reporting so "tests pass" claims can be paired with an actual coverage number instead of just a test count; (2) fill the gaps listed above, especially `TransferForm.jsx` given how much weight its logic carries; (3) a CI pipeline to actually run this suite on every push, since right now it only runs when someone remembers to type `npm test`; (4) Playwright e2e once the app is deployed somewhere, to replace what the manual browser sessions used to verify.
