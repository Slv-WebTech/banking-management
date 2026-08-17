# Interview Guide

**Status of this document: post-verification, pre-deployment.** The project was scaffolded on 2026-08-14, run end-to-end against a real MongoDB instance that same day, and on 2026-08-16 got a second feature (self-service deposit) built and verified the same live way. See [TESTING.md](TESTING.md). It has not been deployed, has no automated tests, and has not been used by anyone beyond these two verification passes. Sections below that would normally rely on production experience (STAR stories about a live incident, deployment war stories, measured user impact) are still marked **TBD** — verifying it locally is not the same as operating it in the real world. But sections that only needed "does this actually run and behave correctly" are no longer speculative; they're updated to say so.

**One genuinely good interview story came out of this project's process**: the first live verification pass found a real gap (no way to fund an account) that code review alone had missed — and rather than just noting it, that gap was actually closed, verified live again, which in turn caught a second, smaller bug (a mislabeled transaction type) before it ever shipped. That's a complete find → fix → verify loop, not just a finding. It's folded into the relevant sections below.

---

## 1. Elevator Pitch (30 seconds)
> I built a banking management system to practice the mechanics real financial applications need: secure authentication, role-based access control, and safe money movement between accounts. It's a React/Node/MongoDB stack with JWT auth and a REST API. The most technically interesting part was designing fund transfers to be race-safe without requiring a MongoDB replica set — using atomic conditional updates and a ledger-entry transaction model instead of multi-document transactions. Working through that trade-off sharpened how I think about data consistency under concurrency.

*(Adjust "sharpened" language once there's been real debugging to point to — right now this is reasoning-based, not battle-tested.)*

## 2. 60-Second Explanation
> It's a banking app with customer, employee, and admin roles — customers deposit into and transfer between accounts by account number and review their transaction history; employees can look up any customer's accounts and activity; admins manage users and see system-wide totals. React and Vite on the frontend, Express and MongoDB on the backend, JWT for auth. The most challenging part was making money-movement operations safe under concurrent requests without assuming production-grade database infrastructure — I used atomic conditional updates instead of multi-document transactions, since the latter needs a MongoDB replica set I didn't want to require for local development. I ran it end-to-end afterward — registered users, moved money between accounts, hit it with a duplicate request to confirm it doesn't double-charge — and everything held up. That same testing pass caught something code review had missed: there was no way for a new account to ever receive its first deposit, since I'd only built transfers between already-funded accounts. I closed that gap in a follow-up session — added a self-service deposit endpoint using the exact same safety pattern as transfers — and testing *that* live caught a second, smaller bug: the transaction history table was mislabeling deposits as debits. Fixed both before either reached a real user. That two-step loop — ship something, test it for real, fix what breaks, test again — is probably the most honest thing I can say about how this project actually got built.

This is now something that's actually been run and observed, not a plan — the difference matters and is worth saying explicitly if asked.

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

Do not claim "Advanced" on anything above until it's been tested/deployed/used under real conditions — that's what would actually justify the label.

## 6–8. Skill Impact / Engineering Skills / Before vs. After
**TBD — insufficient history yet.** These sections ask for growth over time (before/during/after), and there is only a "during" (this scaffold session) so far. Revisit after the project has been through a few real iterations (manual testing, a bug fix, a deployment).

## 9. Project Impact
No users, no usage, no measured metrics — none invented. If this project is ever actually used (even informally, even by one person testing it), record real observations here.

## 10. Resume Bullets
Only what's currently true and verifiable:
- Built a role-based banking API (Node.js/Express/MongoDB) with JWT authentication and race-safe fund transfers using atomic conditional database updates.
- Designed a ledger-entry transaction model in MongoDB to support accurate, filterable per-account transaction history.
- Established a documentation system (architecture, decisions, technical debt, testing status) alongside the codebase to keep the project auditable and easy to hand off.

**Do not add** claims like "improved performance by X%," "supported N users," or "reduced load time by Y" — none of that has been measured. Add real numbers here only once they exist.

## 11. LinkedIn / Portfolio Description
**Short**: A full-stack banking management system (React, Node.js, Express, MongoDB) with JWT auth, role-based dashboards, and race-safe fund transfers.

**Medium**: Built a banking management system covering customer, employee, and admin workflows — account management, fund transfers, and filterable transaction history — on a React/Node/Express/MongoDB stack. Focused on getting the financial-correctness details right: atomic balance updates to prevent overdrafts under concurrent requests, idempotent transfer requests, and a ledger-entry data model for accurate per-account history.

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
- **No automated tests** — exists because the initial pass prioritized a working, honestly-documented scaffold over test coverage; next real step is Jest/Supertest + Vitest, prioritized by the critical-flow list in [TESTING.md](TESTING.md). Priority: high.
- **No true multi-document transaction for transfers** — exists because of the local-dev replica-set constraint; would move to a replica set + real transactions (or reconsider PostgreSQL) for production use. Priority: high if this ever handled real money.
- **Self-service deposit has no cap** — a customer can inflate their own balance arbitrarily. Deliberately chosen for simplicity when the funding gap was closed (see [DECISIONS.md](DECISIONS.md)); a real answer would either add a cap or move to staff-initiated deposits. Priority: medium — it's a known, documented trade-off, not an accidental gap.
- **No deployment yet** — needs real hosting/DB credentials the developer would need to provision. Priority: medium.

*(Resolved since this was first written: admin bootstrap now exists via `npm run seed:admin`; the funding gap — "no way to fund an account" — was closed 2026-08-16 via self-service deposit, itself verified live. That's arguably a better interview story than the gap itself: not just "I found a problem" but "I found it, made a scoping call with the user instead of guessing, fixed it, and testing the fix caught a second smaller bug before it shipped.")*

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
| Real-world relevance | 7 (banking domain, real correctness constraints) |
| Complexity | 5 |
| Code quality | 7 |
| Testing | 5 (+1 — two features now went through the same live-verification discipline, including deliberately testing idempotency and validation-failure paths; still zero automation) |
| Deployment | 0 (unchanged — still not deployed anywhere) |
| Scalability | 4 |
| Security | 6 |
| UI/UX | 5 |
| Documentation | 8 |
| Demonstration potential | 7 (+1 — the app is now genuinely usable start-to-finish by a new user with nothing manual required; still not link-able/shareable since nothing is deployed) |
| Resume value | 7 (+1 — "I found a gap, closed it, and testing the fix caught another bug before it shipped" is a complete, honest engineering story, not just a plan or a single finding) |
| Learning value | 7 |

**Overall**: ~5.8/10 as an interview-ready project **today** (was ~5.6, originally ~5.2). The remaining gap is now almost entirely "make it deployable and add automated tests" — the app itself, within its stated Core MVP scope, is done and proven.

**STRONGEST INTERVIEW AREAS**: the find-gap → ask-user → fix → verify → catch-another-bug loop around the funding feature; the transfer/deposit concurrency design decisions (now backed by two real verification passes, not just reasoning); the scoping/prioritization story; documentation discipline.
**WEAKEST AREAS**: zero automated test coverage; no deployment.
**AREAS TO IMPROVE BEFORE PRESENTING**: add automated tests (there are now two rounds of manual verification to convert into real test cases), deploy it somewhere link-able. Both are first-in-line in [PROJECT_PLAN.md](PROJECT_PLAN.md)'s "Next"/"Later" sections.

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
Deployment → not yet happened
  ↓
Current State: working, documented, and genuinely *verified twice* — the Core MVP is complete and usable end-to-end by a new user with no manual steps
  ↓
Future Vision: git init → automated tests → deployment → loans/statements/notifications
```
Update this diagram as each subsequent stage actually happens — don't advance a stage here until it's true.
