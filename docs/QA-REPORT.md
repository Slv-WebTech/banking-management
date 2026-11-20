# QA Report — Verdant Bank (banking-management)

Senior QA/SDET pass, 2026-11-20, plus a follow-up fix pass the same day. Live app tested in Chrome against a throwaway MongoDB; automated tests run before and after. Fixes are uncommitted in the working tree.

**Environment:** API on :5101, Vite on :5174, private `mongod` on :27217 (the shared :27017 instance went down mid-run, see "Not tested"). Performance data volume: 60k transactions, 3k accounts.

**Result:** 18 findings in the first pass. After the follow-up pass **15 are Fixed, 2 remain open because they need a product decision (B5, B7), and 1 is a scale limitation with no change needed today (P3).** Server tests 77 → **108/108**; client tests 21 → **28/28**; production build OK (role screens now code-split).

## 1. UI (desktop 1280 / tablet 768 / mobile 375, via framed viewports)

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| U1 | Medium | Search icon overlapped the first letter of every search box (`.filters-bar input` shorthand padding reset `padding-left`) | **Fixed** (`index.css`) |
| U2 | Medium | Muted text contrast 3.97–4.23:1 (below WCAG AA) | **Fixed** (`--gray-500` darkened, 5.4:1 on white) |
| U3 | Medium | Search boxes, filter selects, loan-rate input and admin role selects had no accessible name | **Fixed** (aria-labels) |
| U4 | Low | Banners not announced to screen readers; credential inputs lack `autocomplete` | **Fixed** (`role="alert"/"status"`, autocomplete) |
| U5 | Low | Touch targets under 44 px (icon buttons 28 px, pagination 31 px, inputs/selects/buttons 33–39 px, menu toggle 38 px) | **Fixed**: under 640 px every button, input, select, tab, menu toggle and icon button has `min-height: 44px`. Verified live at 375 px on `/dashboard`, `/loans`, `/employee`, `/admin`: **0 targets under 44 px, no horizontal overflow** |
| U6 | Low | No skip-to-content link | **Fixed**: `Skip to main content` link (first Tab stop, visible on focus) targeting `<main id="main-content">`. Verified live: first Tab focuses it at top of viewport |

Passed throughout: no horizontal page overflow at any width; logical Tab order and visible focus; one `h1` per page; landmarks, `lang`, title; zero console errors.

## 2. API security and contracts

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| S1 | High | Malformed ids / object-typed fields / bad dates returned **500** | **Fixed**: error handler maps Cast/Validation errors to 400; `isMongoId`/`isString` validators |
| S2 | High | Login timing oracle (user enumeration) | **Fixed**: dummy bcrypt compare |
| S3 | Medium | Stack traces returned whenever `NODE_ENV !== 'production'` | **Fixed**: only in explicit `development` |
| S4 | Medium | Password accepted at 9000 chars; bcrypt truncates at 72 | **Fixed**: 8–72 (server and form `maxLength`) |
| S5 | Low | `amount: [1]` / `true` coerced and accepted | **Fixed** (`parseAmount`) |
| S6 | Low | Transfer/deposit (and loan-action) rate limiters were per IP, so users behind one proxy/NAT shared a bucket | **Fixed**: limiters keyed by authenticated user id; 429 message now says to wait a minute. Verified live (dev mode): user A got 429 on the 11th deposit while user B from the same IP succeeded |

Passed: 401 without token on all 23 protected endpoints; 403 for a customer on all 11 staff/admin endpoints; forged/tampered JWTs rejected; IDOR attempts 403; mass assignment ignored; NoSQL/regex injection neutralised; Helmet headers; CORS; 10 kb body cap; login limiter; suspended users' tokens rejected; admins cannot change their own role/status.

## 3. Business logic and transaction integrity

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| B1 | High | Balance float drift (`51.000000000000014`) | **Fixed**: `adjustBalance()` rounds to cents inside every atomic update |
| B2 | Medium | Loan due dates overflowed on month-ends | **Fixed**: clamped to month end |
| B3 | Medium | Employee "Pending Closures" vanished during an account search | **Fixed**: `?status=` filter + separate fetch |
| B4 | Medium | Approve/reject failed silently | **Fixed**: error banner (also added to admin role/status actions, which had the same gap) |
| B5 | Medium (design) | Self-service deposits create money from nothing (500k minted in 5 calls) | **Open — needs a product decision.** The deposit feature is the only way to fund an account in this app. Fixing it means choosing a model: remove customer deposits, require staff-approved cash deposits, or integrate an external funding source. A per-day cap would only slow the minting and was deliberately not added without that decision |
| B6 | Low | Unlimited pending loan applications per customer | **Fixed**: max 3 pending per borrower (`MAX_PENDING_LOANS`, default 3, in `.env.example`); clear 400 message, shown in the UI. Verified live. Soft cap: two truly simultaneous applications could briefly exceed it (no unique index possible for a count) |
| B7 | Low | Staff can approve each other's loans (collusion); no maker-checker beyond "not your own" | **Open — needs a product decision.** Real maker-checker needs a policy (dual approval above a threshold? which roles may approve what?) and a second-approval workflow with new states. Not something to invent unilaterally |
| B8 | Low | `failed`/`pending` transaction statuses filterable but never produced | **Fixed**: dead status dropdown removed from the history table (API still accepts `status`) |

Verified correct: concurrent transfers never overdraw and conserve money; same-`clientRef` deposits credit once; concurrent loan approvals — exactly one wins; parallel EMI payments charge once; EMI and schedule math; closure lifecycle; self-approval blocked; deposit cap boundary.

## 4. Performance (60k tx / 3k accounts, local)

All key endpoints 2–110 ms. Login/register ≈ 0.6–0.7 s (bcryptjs, cost 12).

| # | Finding | Status |
|---|---------|--------|
| P1 | Missing indexes (`accounts.owner`, `accounts.status`, `transactions.createdAt`) | **Fixed** (added to schemas) |
| P2 | `/accounts/all` and `/admin/users` unpaginated | **Fixed**: optional `?page`/`?limit` (default 100, max 500), full count in `X-Total-Count` (exposed via CORS); response stays a bare array so existing clients keep working. Staff screens show "Showing the first N of M…" when truncated. Verified live (130 extra accounts: "first 100 of 134") |
| P3 | Deep `skip()` pagination and case-insensitive `$regex` search cannot use indexes | **Not changed — scale limitation, not a defect today.** Page 1,500 of 40k rows took 93 ms and regex search ~100 ms. Fixing it means cursor pagination (API contract change) and a text/prefix index; do it when history exceeds roughly 1M rows |
| P4 | Every keystroke in a staff search refetched four endpoints | **Fixed**: 300 ms debounce on all search/filter inputs (customer, employee, admin) and the employee effects are split so a search refetches only its own list. Verified live: 14 keystrokes → 1 request; employee account search → exactly 1 request, closure queue untouched |
| P5 | Single 264 kB JS chunk | **Fixed**: customer-loans, employee and admin screens are lazy-loaded; main chunk 248.6 kB (80.8 kB gzip) with 4.6–6.9 kB route chunks |

## 5. UX

Fixed in the first pass: full-page skeleton on every keystroke, `₹5,000.5` formatting, missing loan filter options, stale-response race.

| # | Finding | Status |
|---|---------|--------|
| X1 | Approve/Reject columns off-screen on a 375 px screen | **Fixed**: action column pins to the right edge on small screens for loan, closure and admin tables. Verified live: actions inside the viewport |
| X2 | Generic "Insufficient balance or inactive account" / "Validation failed" messages | **Fixed**: server now says "Insufficient balance", "Source account is not active" or "Payment account is not active"; client shows the first field-level validation message (`utils/apiError.js`) instead of "Validation failed" |
| X3 | No customer-facing "request account closure" control | **Fixed**: "Request closure" on zero-balance active account cards (with confirmation), disabled hint "Closure needs a zero balance" otherwise; error banner on failure. Verified live: account went to PendingClosure |
| X4 | No hint explaining the transfer limit | **Fixed**: 429 message now reads "Too many transfer attempts. Please wait a minute and try again." and is shown in the form's alert |

## 6. Tests

`server/tests/qa.test.js` (31 tests): malformed input → 400, amount typing, error-handler stack/Cast mapping, login equalisation, month-end/leap-year dates, `status` filter, pagination + `X-Total-Count` + CORS exposure, pending-loan cap, specific failure messages, concurrent-transfer integrity, strict `10 × 0.10 = 1`.
`client/src/utils/utils.test.jsx` (7 tests): `errorMessage`, `formatMoney`, `useDebouncedValue` (fake timers), `AccountCard` closure button states.

## 7. Remaining recommendations

1. **B5** — decide the funding model before real use (product decision).
2. **B7** — define maker-checker policy for loan approvals (product decision).
3. Store money as integer minor units and wrap multi-document money moves in Mongo transactions instead of compensating writes (B1 is mitigated, not eliminated).
4. Cursor pagination / text index when data grows (P3).
5. Add Playwright smoke tests for the three roles and a CI step running `npm test` plus `npm run build`.

## Not tested

- **Shared MongoDB on :27017 stopped during the first run** (connection refused; the process was gone) and was still down afterwards. I did not restart it; a private instance on :27217 was used for all tests.
- **Screenshots were unavailable in the follow-up pass** (Chrome's capture timed out even on a static page), so the follow-up UI fixes were verified through the DOM, computed styles, network and console rather than visually. The first pass's visual checks stand.
- Real device/touch emulation (window resizing did not change the viewport, so framed viewports were used), cross-browser, an actual screen reader, visual regression diffs.
- Production mode (HSTS over HTTPS, `NODE_ENV=production` masking verified by unit test only), load/soak beyond 60k rows.
