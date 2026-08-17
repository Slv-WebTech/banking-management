# Technical Debt

Ordered roughly by priority. Nothing here is hidden or downplayed — this is the honest gap list.

## High
1. **No automated tests.** Zero unit, integration, or e2e tests exist anywhere in `client/` or `server/`. **Update 2026-08-14**: the core flows this item worried about (transfer atomicity, idempotency, insufficient-balance rejection, role/ownership checks, suspend-takes-immediate-effect, and now deposit) have all been manually verified end-to-end against a real database — see [TESTING.md](TESTING.md) for the full results. That reduces risk but doesn't replace regression protection: none of this is automated, so nothing stops a future change from silently breaking any of it.
2. **No true multi-document transaction for transfers.** Debit and credit legs are two separate atomic operations plus a best-effort compensating refund, not one ACID transaction. A process crash between the two steps is not automatically recovered. See [DECISIONS.md](DECISIONS.md) for the trade-off reasoning.
3. **Not a git repository yet.** `D:\banking-management` has no `.git` — no version history, no ability to diff or revert. Should be initialized before further changes accumulate (user decision, not done unilaterally).

## Medium
4. **Client npm audit findings (4: 3 moderate, 1 high).**
   - `react-router-dom` → open-redirect / SSR hydration constructor injection advisories. `npm audit fix` did not auto-resolve (fix likely requires a version outside the current `^6.26.0` range). Needs a deliberate version bump + retest, not an automatic `--force`.
   - `esbuild` (via `vite`) → dev server can be sent requests from any website. Dev-only impact (doesn't ship to production bundles), but the fix requires a breaking Vite 5 → 8 major upgrade.
5. **Account closure flow is half-built.** `POST /accounts/:id/request-closure` exists; nothing lets staff finalize `PendingClosure → Closed`. An account can get stuck in `PendingClosure` indefinitely.
6. **Admin user list has no pagination.** `GET /admin/users` returns every user in one response — fine at portfolio scale, will not scale.
7. **No structured logging.** Only `console.log`/`console.error`. No request logging (no `morgan` or equivalent), no correlation IDs, nothing that would help debug a production incident.
8. **No ESLint/Prettier configured in either `client/` or `server/`.** Code style has been kept consistent by hand during the initial scaffold, but nothing enforces it going forward.
9. **Self-service deposit has no upper limit.** *(New 2026-08-16, see [DECISIONS.md](DECISIONS.md).)* A customer can deposit any amount into their own account with no cap and no source of funds — realistic for "give the portfolio demo a balance to play with," not realistic as an actual bank feature. Documented trade-off, not an oversight; revisit if this project ever needs to look more like a real bank than a demo.

## Low
10. **Transaction `search` filter only matches the internal `reference` field** (an ObjectId string), not anything a human would naturally search by (counterparty account number, description text).
11. **No "update profile" endpoint** for customers, despite being listed in the original brief's account-management features.
12. **`Transaction.type` enum still includes an unused `withdrawal` value** — `deposit` is now implemented (2026-08-16), but there's no corresponding "withdraw cash" flow, only deposits and transfers. Not harmful, just unused schema surface.
13. **No compound index on `{ account: 1, createdAt: -1 }`** for `Transaction` — current single-field indexes are adequate at low volume; revisit if history queries get slow.
14. **UI has no toast/notification system** — success/error feedback is inline text per form only, and doesn't persist across navigation.

## Explicitly Not Debt (deliberate scope cuts, tracked separately)
Loans, statements/PDF, notifications, and all "bonus" features (dark mode, QR, multi-currency, AI assistant, etc.) are **not debt** — they were never in scope for this pass. See [FUTURE_FEATURES.md](FUTURE_FEATURES.md) and the Core-MVP decision in [DECISIONS.md](DECISIONS.md).

## Resolved
- ~~No admin bootstrap path~~ — fixed 2026-08-14 via `server/scripts/seedAdmin.js` (`npm run seed:admin -- <email>`), promotes an already-registered user to `admin`. See [DATABASE.md](DATABASE.md).
- ~~No way to fund an account~~ — fixed 2026-08-16 via self-service deposit (`POST /api/transactions/deposit`, `DepositForm.jsx`). See [IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md) and [DECISIONS.md](DECISIONS.md) for the self-service-vs-staff-initiated trade-off this introduced (tracked as item 9 above).
- ~~`TransactionTable` mislabels non-transfer-credit transactions as "Debit"~~ — this bug was introduced and fixed within the same 2026-08-16 session, while building the deposit feature (a `deposit`-type transaction would have displayed as "Debit" under the old ternary logic). Caught before it ever shipped to a user; see [CHANGELOG.md](CHANGELOG.md).
