# Interview Guide

**The project is called Verdant Bank** (renamed 2026-08-22 from the generic working title "Banking Management System" — see [DECISIONS.md](DECISIONS.md)). Use the new name in any pitch, resume bullet, or portfolio description below; it doesn't change any of the technical substance this guide is built on.

**Status of this document: live-tested and QA-hardened (2026-11-20), pre-deployment.** The project was scaffolded on 2026-08-14, run end-to-end against a real MongoDB instance that same day, and on 2026-08-16 got a second feature (self-service deposit) built and verified the same live way. On 2026-08-17 it gained an automated test suite (Jest/Supertest for the backend, Vitest/RTL for the frontend). On 2026-08-22 it gained a full UI/UX redesign plus three new features (staff closure approval, broader transaction search, a loan management module) — all built with automated test coverage first (87 tests total across both suites: 66 backend, 21 frontend), but **not yet re-verified live in a browser against a real database**. See [TESTING.md](TESTING.md). It has not been deployed, and has not been used by anyone beyond the manual verification passes from 2026-08-14/16. Sections below that would normally rely on production experience (STAR stories about a live incident, deployment war stories, measured user impact) are still marked **TBD** — passing tests locally is not the same as operating it in the real world. But sections that only needed "does this actually run and behave correctly, provably" are no longer speculative for the original Core MVP; they're updated to say so. The 2026-08-22 additions are provably correct *by automated test*, which is a meaningfully different (weaker) claim than "verified live" — this guide is careful to keep that distinction, not blur it.

**One genuinely good interview story came out of this project's process**: the first live verification pass found a real gap (no way to fund an account) that code review alone had missed — and rather than just noting it, that gap was actually closed, verified live again, which in turn caught a second, smaller bug (a mislabeled transaction type) before it ever shipped. That's a complete find → fix → verify loop, not just a finding. It's folded into the relevant sections below.

---

## 1. Elevator Pitch (30 seconds)
> I built Verdant Bank, a banking application, to practice the mechanics real financial applications need: secure authentication, role-based access control, safe money movement between accounts, and now a loan product with real amortization math. It's a React/Node/MongoDB stack with JWT auth and a REST API. The most technically interesting parts were designing fund transfers to be race-safe without requiring a MongoDB replica set — using atomic conditional updates and a ledger-entry transaction model instead of multi-document transactions — and, more recently, building the loan repayment schedule's reducing-balance EMI math and unit-testing it against hand-derived values before writing a single line of code that depended on it. Working through both sharpened how I think about correctness in code that handles other people's money.

*(Adjust "sharpened" language once there's been real production debugging to point to — the concurrency reasoning is verified live for sequential/idempotent cases; the loan math is verified by unit test, not yet live.)*

## 2. 60-Second Explanation
> It's a banking app with customer, employee, and admin roles — customers deposit into and transfer between accounts by account number and review their transaction history; employees can look up any customer's accounts and activity; admins manage users and see system-wide totals. React and Vite on the frontend, Express and MongoDB on the backend, JWT for auth. The most challenging part was making money-movement operations safe under concurrent requests without assuming production-grade database infrastructure — I used atomic conditional updates instead of multi-document transactions, since the latter needs a MongoDB replica set I didn't want to require for local development. I ran it end-to-end afterward — registered users, moved money between accounts, hit it with a duplicate request to confirm it doesn't double-charge — and everything held up. That same testing pass caught something code review had missed: there was no way for a new account to ever receive its first deposit, since I'd only built transfers between already-funded accounts. I closed that gap in a follow-up session — added a self-service deposit endpoint using the exact same safety pattern as transfers — and testing *that* live caught a second, smaller bug: the transaction history table was mislabeling deposits as debits. Fixed both before either reached a real user. That two-step loop — ship something, test it for real, fix what breaks, test again — is probably the most honest thing I can say about how this project actually got built.

This is now something that's actually been run and observed, not a plan — the difference matters and is worth saying explicitly if asked.

*(2026-08-22 addition, worth folding in if the conversation has room)*: the project since grew a loan management module — apply, staff review with a set interest rate, a reducing-balance EMI repayment schedule, and repayment that closes the loan automatically — plus a full UI/UX redesign and two smaller feature gaps closed (staff account-closure approval, and transaction search that actually matches what a human would search for). All of it shipped with automated test coverage, including a dedicated unit-test pass on the EMI math *before* any endpoint was built on top of it — a deliberate de-risking choice for the highest-stakes new logic in the project.

## 3. Detailed Explanation (2–3 minutes)

### Problem
Financial applications need to move money between accounts without ever allowing a negative balance, without double-processing a request, and while keeping every account's activity auditable. That's a narrower, harder version of "build a CRUD app."

### Solution
A REST API (Express) backed by MongoDB, with three roles (customer/employee/admin) each getting a purpose-built dashboard. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical breakdown.

### Architecture
- **Frontend**: React 18 SPA (Vite), route-based code organization, a single `AuthContext` for session state, Axios with an auth interceptor.
- **Backend**: Express, layered as routes → middleware (auth/validation) → controllers → Mongoose models.
- **Database**: MongoDB — three collections (`User`, `Account`, `Transaction`), with `Transaction` modeled as ledger entries (see below).
- **Auth**: JWT bearer tokens, bcrypt password hashing, role check middleware.
- **Deployment**: planned (Vercel/Render/Atlas), not yet done — see [DEPLOYMENT.md](DEPLOYMENT.md).

### Important Features
- **Fund transfer with race-safety and idempotency** — the feature with the most actual engineering thought behind it (see Technical Challenges below).
- **Role-based dashboards** — three genuinely different views over the same data, driven by one `ProtectedRoute` component and role checks on the API side, not duplicated logic.
- **Filterable, paginated transaction history** — because a real bank statement isn't "dump every row."

### Technical Challenges
**Challenge: safe concurrent fund transfers without a replica set.**
- **Problem**: prevent overdrafts and double-processing when transfers can arrive concurrently, without assuming production-grade MongoDB infrastructure (a replica set, which multi-document transactions require).
- **Why it was difficult**: the "obvious" correct answer (wrap debit+credit in a transaction) wasn't available under the local-dev constraint I was working within.
- **Approaches considered**: (1) multi-document transactions — rejected, infra requirement; (2) application-level locking — rejected, doesn't survive multiple server instances and adds complexity; (3) atomic single-document conditional updates + compensating refund — chosen.
- **Chosen solution**: `findOneAndUpdate` with a `balance >= amount` guard makes the debit atomic and self-validating at the database level; the credit is a second atomic update; if the credit fails, the debit is refunded.
- **Why**: keeps local dev simple while making the one property that must never break — no negative balance — genuinely race-safe.
- **Result**: Verified live on 2026-08-14 — insufficient-balance transfers are correctly rejected without touching the source account, successful transfers produce correct balances on both sides, and a deliberately duplicated request (same idempotency key) correctly returns the original result instead of double-charging. **Still not verified**: true concurrent/simultaneous requests against the same account — only sequential requests, including the duplicate-retry case, have been tested so far. That's the honest remaining gap, not "it works great" without qualification. See [TESTING.md](TESTING.md).

**Challenge: trusting reducing-balance EMI amortization math before building anything on top of it.**
- **Problem**: the loan management module needs to compute a monthly EMI and a full per-installment amortization schedule (principal/interest split, remaining balance) for arbitrary principal/rate/term combinations — and get it *exactly* right, since it's real financial arithmetic, not a display detail.
- **Why it was difficult**: floating-point rounding at each installment can drift the schedule's total away from the actual principal by the end of the loan if handled naively (round every intermediate value and the drift compounds); a 0% interest rate breaks the standard EMI formula (division by zero); and it's easy to write a test that just re-checks the implementation's own logic instead of independently verifying it's correct.
- **Approach**: implemented the EMI formula and schedule builder as pure functions (`server/utils/loanSchedule.js`) with zero dependency on the database or any controller, then wrote a dedicated test file for it (`loanSchedule.test.js`, 13 tests) *before* writing the loan controller that would depend on it. Tests include hand-derived exact values (e.g. a single-month loan's EMI collapses algebraically to `principal * (1 + monthlyRate)`, which can be checked by hand — used as an independent check rather than a self-consistency check), a 0%-rate edge case, and a property test confirming the schedule's principal components always sum to exactly the original principal regardless of rounding, by forcing the final installment to absorb whatever balance remains instead of using the formula's rounded output for that last row.
- **Result**: all 13 tests pass; the schedule construction was correct on the first integration attempt (`loans.test.js`'s 14 tests, covering the full apply/approve/reject/repay flow, passed with only one *test-design* bug found — a test assumed a loan could be fully repaid using only its own disbursed principal, which is mathematically impossible whenever interest is nonzero, since repayment always exceeds principal). Not yet verified live in a browser.

**Every other "Technical Challenges" entry (debugging story, performance fix, etc.) is TBD until it actually happens.**

### Technical Decisions
See [DECISIONS.md](DECISIONS.md) for the full ADR-style log — it already contains real, dated decisions with alternatives considered and trade-offs accepted (MongoDB vs. PostgreSQL, ledger-entry model, atomic-update strategy, clientRef idempotency, Core-MVP scope cut). That file *is* the source material for this section — don't duplicate it here, reference it.

## 4. STAR Stories
**TBD.** None of these have happened yet: no production bug has been hunted, no performance problem has been measured and fixed, no deployment has gone wrong and been recovered from. Writing STAR stories now would mean inventing a Situation that didn't occur — explicitly against this project's rules. Populate this section the first time one of these actually happens:
- [ ] Difficult bug (needs: a real bug, found after real usage)
- [ ] Difficult feature (candidate once loans/statements are built)
- [ ] Performance improvement (needs: a measured before/after)
- [ ] Architectural decision → candidate already exists (the transfer atomicity decision) but lacks a "Result" — see above
- [ ] Security problem found & fixed
- [ ] Debugging story
- [ ] Working with ambiguity → **this one can be written honestly now**, see below.

**Working with ambiguity (real, can be told today)**:
- **Situation**: the original project brief covered a huge feature surface (loans, statements, notifications, 10+ bonus features) with no explicit priority order.
- **Task**: decide what to actually build first without either guessing at unstated requirements or stalling on every ambiguous point.
- **Action**: asked the person requesting the work two direct questions — database choice (MongoDB vs. PostgreSQL) and scope (Core MVP vs. attempt everything) — instead of assuming, then scoped the first pass to a fully-working vertical slice (auth → accounts → transfers → history → dashboards) and explicitly deferred the rest to a tracked backlog rather than half-building everything.
- **Result**: a smaller surface area that is honestly closer to "done" and easier to verify than a larger one would have been — verifiable against [FEATURES.md](FEATURES.md)/[FUTURE_FEATURES.md](FUTURE_FEATURES.md), which record exactly what was and wasn't included.

## 5. Technical Skills Demonstrated
| Skill | Evidence in Project | Level Demonstrated | Interview Talking Point |
|---|---|---|---|
| REST API design | Resource-based routing, consistent error shape, layered middleware | Intermediate | Walk through the transfer endpoint's request lifecycle |
| MongoDB/Mongoose schema design | Three related collections, ledger-entry modeling choice | Intermediate | Explain why transactions are modeled as ledger entries, not single documents |
| Authentication/authorization | JWT + bcrypt + role middleware, immediate-effect suspension | Intermediate | Explain how suspending a user takes effect without token revocation infrastructure |
| Concurrency-safe data operations | Atomic conditional updates for balance changes | Intermediate (verified correct live for sequential and duplicate-retry cases; **not yet load-tested for true concurrency** — say so if asked) | Walk through the debit/credit/compensating-refund flow |
| React application structure | Context for auth, route-level data fetching, shared presentational components | Intermediate | Explain the `AuthContext` + `ProtectedRoute` pattern |
| Security fundamentals | helmet, rate limiting, input validation, NoSQL-injection sanitization | Beginner/Intermediate | Explain the request middleware pipeline |
| Technical documentation | This `/docs` set | Intermediate | Explain why documenting trade-offs (not just features) matters |
| Financial calculation correctness | Reducing-balance EMI/amortization math (`loanSchedule.js`), independently unit-tested with hand-derived values before any code depended on it | Intermediate (correct by unit test with 13 passing cases; **not yet verified against real currency/scale edge cases in production**) | Walk through why the final installment forces the remaining balance instead of trusting the formula's rounded output |
| Automated testing | Jest/Supertest (backend, 108 tests) + Vitest/RTL (frontend, 28 tests), including a deliberate "write the pure-math tests before the integration tests that depend on it" ordering for the highest-risk new logic | Intermediate | Explain the test pyramid choice for the loan feature specifically |
| Design systems / UI engineering | A full 2026-08-22 redesign — CSS custom-property token system, a small reusable component set (`Button`, `Badge`, `Icon`, `EmptyState`, `Skeleton`), consistent responsive breakpoints — built without a UI framework dependency | Beginner/Intermediate | Explain the token system and why no component library was added |

Do not claim "Advanced" on anything above until it's been tested/deployed/used under real conditions — that's what would actually justify the label.

## 6–8. Skill Impact / Engineering Skills / Before vs. After
**TBD — insufficient history yet.** These sections ask for growth over time (before/during/after), and there is only a "during" (this scaffold session) so far. Revisit after the project has been through a few real iterations (manual testing, a bug fix, a deployment).

## 9. Project Impact
No users, no usage, no measured metrics — none invented. If this project is ever actually used (even informally, even by one person testing it), record real observations here.

## 10. Resume Bullets
Only what's currently true and verifiable:
- Built Verdant Bank, a role-based banking application (React/Node.js/Express/MongoDB) with JWT authentication and race-safe fund transfers using atomic conditional database updates.
- Designed a ledger-entry transaction model in MongoDB to support accurate, filterable per-account transaction history.
- Built a loan management module including a reducing-balance EMI amortization engine, unit-tested independently (13 tests, hand-derived expected values) before any endpoint depended on it.
- Wrote an 87-test automated suite (Jest/Supertest backend, Vitest/React Testing Library frontend) covering authentication, authorization, money-movement atomicity/idempotency, and loan math correctness.
- Designed and implemented a CSS design-token system and reusable component set for the frontend without adding a UI framework dependency.
- Established a documentation system (architecture, decisions, technical debt, testing status) alongside the codebase to keep the project auditable and easy to hand off.

**Do not add** claims like "improved performance by X%," "supported N users," or "reduced load time by Y" — none of that has been measured. Add real numbers here only once they exist.

## 11. LinkedIn / Portfolio Description
**Short**: Verdant Bank — a full-stack banking application (React, Node.js, Express, MongoDB) with JWT auth, role-based dashboards, race-safe fund transfers, and a loan module with tested amortization math.

**Medium**: Built Verdant Bank, covering customer, employee, and admin workflows — account management, fund transfers, filterable/searchable transaction history, staff-reviewed loan applications with a reducing-balance EMI repayment schedule, and account-closure approval — on a React/Node/Express/MongoDB stack. Focused on getting the financial-correctness details right: atomic balance updates to prevent overdrafts under concurrent requests, idempotent transfer/repayment requests, a ledger-entry data model for accurate per-account history, and an 87-test automated suite covering the highest-risk logic, including a dedicated unit-test pass on the loan math before anything else depended on it.

**Detailed**: **TBD** until there's a working, tested, deployed version to describe honestly — the detailed version should cover challenges and results, and there aren't real ones yet.

## 12–13. Common Interview Questions & Answers
A starter set that's answerable honestly today:

**Q: Why MongoDB over PostgreSQL for a banking app, given relational integrity usually matters more here?**
- **Short answer**: It was an explicit, informed trade-off, not a default.
- **Detailed answer**: PostgreSQL's transactional guarantees are a more natural fit for financial data, but MongoDB was chosen for faster iteration on a portfolio-scale project, with the understanding that the integrity guarantees PostgreSQL would give "for free" (e.g., atomic multi-row updates) had to be reconstructed deliberately — atomic single-document conditional updates for balance changes, a ledger-entry model instead of relational joins for history.
- **Project evidence**: [DECISIONS.md](DECISIONS.md), `server/controllers/transactionController.js`.
- **Follow-up**: "What would you do differently at real scale?" → Use a replica set and real multi-document transactions, or move to PostgreSQL if the relational guarantees are worth the schema rigidity.

**Q: How do you prevent a double-submitted transfer from charging someone twice?**
- **Short answer**: Client-generated idempotency key, checked server-side before processing.
- **Detailed answer**: the client generates a UUID (`clientRef`) once per transfer attempt; the server checks whether a transaction with that `clientRef` already exists for the source account before doing any balance mutation, and returns the original result instead of reprocessing if so.
- **Project evidence**: `client/src/components/TransferForm.jsx`, `server/controllers/transactionController.js`.
- **Follow-up**: "What if the client never sends one?" → The transfer still processes normally, just without duplicate protection for that specific request — a deliberate "degrade gracefully" choice, not a hard requirement.

**More questions should be added here as the project matures — especially anything from a real interview, and anything uncovered while actually testing/deploying.**

## 14. "Why Did You Choose X?"
Covered in [DECISIONS.md](DECISIONS.md) — that file is written in exactly the format this section needs (Decision/Context/Options/Reason/Consequences). Reference it directly rather than duplicating.

## 15. "What Was the Hardest Part?"
**Best honest answer available today**: reasoning through the fund-transfer concurrency model without being able to lean on a database-level transaction guarantee — deciding what "safe enough" meant given the local-dev constraint, and being explicit (in [DECISIONS.md](DECISIONS.md)) about what that trade-off does *not* cover (a crash mid-transfer), rather than presenting it as airtight. **This answer will get stronger once the logic has actually been tested under concurrency** — right now it's a design story, not a debugging story.

## 16. "What Would You Improve?"
Answerable honestly right now — pull directly from [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md):
- **No frontend automated tests for the 2026-08-22 additions** — `CustomerLoans.jsx`, the new staff review queues, `TransferForm.jsx`, `AccountCard.jsx`, and `Navbar.jsx` all still have zero direct test coverage, and there's no coverage reporting configured anywhere to put a number on the gap. Priority: medium.
- **The 2026-08-22 features haven't been re-verified live** — closure approval, transaction search, loan management, and the redesigned dashboards are only proven by automated test + a successful build, not by an actual browser session against a real database. Priority: medium-high, since "live-verified" was this project's own bar for the original Core MVP.
- **No true multi-document transaction for transfers** — exists because of the local-dev replica-set constraint; would move to a replica set + real transactions (or reconsider PostgreSQL) for production use. Priority: high if this ever handled real money.
- **Self-service deposit has no cap** — a customer can inflate their own balance arbitrarily. Deliberately chosen for simplicity when the funding gap was closed (see [DECISIONS.md](DECISIONS.md)); a real answer would either add a cap or move to staff-initiated deposits. Priority: medium — it's a known, documented trade-off, not an accidental gap.
- **No deployment yet** — needs real hosting/DB credentials the developer would need to provision. Priority: medium.

*(Resolved since this was first written: admin bootstrap now exists via `npm run seed:admin`; the funding gap — "no way to fund an account" — was closed 2026-08-16 via self-service deposit, itself verified live; "no automated tests" was closed 2026-08-17 and substantially expanded 2026-08-22 (87 tests total). That's arguably a better interview story than any single gap: not just "I found a problem" but "I found it, made a scoping call with the user instead of guessing, fixed it, and testing the fix caught a second smaller bug before it shipped" — repeated, now, across two separate features.)*

## 17. "What Did You Learn?"
- **Technical**: how to reason about database-level atomicity guarantees and design around their absence instead of assuming a stronger guarantee than the infrastructure provides.
- **Architecture**: how to model transaction history as ledger entries instead of a single "transfer" record, and why that choice matters for query simplicity later.
- **Product**: how to take an intentionally huge feature brief and cut it down to a shippable, verifiable first slice without losing track of what was deferred.
- **Engineering**: the value of writing down *why* a decision was made, not just what was built — this doc set exists because of that.
- **Professional**: how to ask two sharp scoping questions (database, MVP-vs-everything) instead of guessing at an ambiguous brief.

## 18. Interview Strength Score
Scored honestly, matching [PROJECT_SCORE.md](PROJECT_SCORE.md)'s spirit — not inflated:

| Category | Score /10 |
|---|---|
| Technical depth | 6 (real concurrency/consistency reasoning, confirmed correct for sequential + idempotent-retry cases live across two features now, still not proven under true concurrent load) |
| Architecture | 7 |
| Problem-solving | 7 (the live verification pass found a real gap code review missed, *and* the fix for it was itself verified live, catching a second bug — that's a full loop, not a one-off catch) |
| Real-world relevance | 7 (banking domain, real correctness constraints; loan module adds a genuine second financial-product surface) |
| Complexity | 6 (+1 — reducing-balance EMI amortization is real financial math, plus a second multi-state workflow (loan Pending/Approved/Rejected/Closed) alongside the existing account-closure workflow) |
| Code quality | 7 |
| Testing | 7 (+2 — an automated suite now exists and is substantial: 87 tests across backend and frontend, including a deliberate test-the-math-before-building-on-it pass for the highest-risk new logic. Not a 9/10: no e2e tests, no coverage reporting, and zero automated coverage for any of the 2026-08-22 frontend — `CustomerLoans.jsx`, the two new staff queues, `TransferForm.jsx`, `AccountCard.jsx`, `Navbar.jsx` are all still untested.) |
| Deployment | 0 (unchanged — still not deployed anywhere) |
| Scalability | 4 |
| Security | 6 |
| UI/UX | 7 (+2 — a genuine design-token system, a real reusable component set, consistent responsive behavior across several breakpoints, and specific accessibility work (focus-visible, reduced-motion, aria-labels). Not a 9/10: the redesigned authenticated dashboards haven't been re-verified live in a browser yet, only via `vite build` + existing tests passing.) |
| Documentation | 9 (+1 — the documentation discipline held up under a materially larger surface area: every doc in this set was reviewed and kept honest through two feature rounds and a rename, not just written once and left stale.) |
| Demonstration potential | 8 (+1 — loans, a redesigned UI, and two staff-review queues genuinely broaden what there is to demo; still not link-able/shareable since nothing is deployed) |
| Resume value | 8 (+1 — real financial math, tested before being trusted, is a stronger claim than CRUD-plus-auth alone) |
| Learning value | 7 |

**Overall**: ~6.5/10 as an interview-ready project **today** (was ~5.8, then ~5.6, originally ~5.2). The remaining gap is now almost entirely "deploy it, re-verify the new features live, and close the frontend test-coverage gap for the 2026-08-22 additions" — the underlying engineering, within its stated scope, is sound and largely proven.

**STRONGEST INTERVIEW AREAS**: the find-gap → ask-user → fix → verify → catch-another-bug loop around the funding feature; the transfer/deposit concurrency design decisions (verified live for sequential/idempotent cases); the loan EMI math's test-before-you-build-on-it discipline; the scoping/prioritization story; sustained documentation discipline across a growing codebase.
**WEAKEST AREAS**: no deployment; zero frontend automated test coverage for anything built 2026-08-22; the 2026-08-22 backend features haven't been verified live yet, only by automated test.
**AREAS TO IMPROVE BEFORE PRESENTING**: deploy it somewhere link-able, re-verify the redesign and the three new features live against a real database, and add frontend tests for `CustomerLoans.jsx` and the new staff queues. All tracked in [PROJECT_PLAN.md](PROJECT_PLAN.md)'s "Next"/"Later" sections.

## 19. Personal Skill Growth Summary
**TBD** — one data point (this session) isn't a growth trend yet. Start tracking after the next few real sessions of work on this project.

## 20. Project Story
```
Idea (banking management system brief)
  ↓
Problem (large brief, no explicit priority)
  ↓
Planning (asked: DB choice? scope — MVP or everything?)
  ↓
Architecture (layered Express API + React SPA, ledger-based transactions)
  ↓
Implementation (auth, accounts, transfers, history, 3 dashboards)
  ↓
Challenges (transfer concurrency without a replica set → atomic updates + compensating refund)
  ↓
Testing (2026-08-14: real MongoDB, real API calls, real browser clicks, all 3 roles — see TESTING.md)
  ↓
Gap found (no way to fund an account — the app's own logic passed on first live run, but a whole capability was missing)
  ↓
Iteration (2026-08-16: asked the user self-service vs. staff-initiated → built self-service deposit, same pattern as transfers)
  ↓
Testing again (deposit verified live the same way — API + browser — and that pass caught a second, smaller bug: a mislabeled transaction type, fixed before it shipped)
  ↓
Version control + automated tests (2026-08-17: git init, pushed to GitHub, Jest/Supertest + Vitest/RTL suites added — 53 tests)
  ↓
Redesign + feature expansion (2026-08-22: full UI/UX rebuild, renamed to Verdant Bank, three new features — closure approval, broader transaction search, loan management)
  ↓
Highest-risk logic tested first (the loan EMI/amortization math was unit-tested — 13 tests, hand-derived values — *before* the controller that depends on it was written)
  ↓
Testing expands (2026-08-22: suite grows to 87 tests across both sides; new features proven by automated test, not yet re-verified live)
  ↓
Deployment → not yet happened
  ↓
Current State: a materially larger, still-honestly-documented project — the original Core MVP remains twice-verified live; everything added since is tested but not yet exercised in a real browser against a real database
  ↓
Future Vision: re-verify the 2026-08-22 work live → close the frontend test-coverage gap → deployment → statements/notifications
```
Update this diagram as each subsequent stage actually happens — don't advance a stage here until it's true.
