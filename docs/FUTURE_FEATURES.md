# Future Features

Backlog only — nothing here should be implemented until explicitly requested. Categorized by priority per the documentation protocol.

## High Priority
*(Needed to fulfill the original project brief's core feature list — not yet bonus territory.)*

- **Staff account-closure approval** — finalize the `PendingClosure → Closed` transition. Depends on: existing `Account.status` enum (already supports it). Complexity: low.
- **Loan management** — apply, track status, EMI schedule (customer); approve/reject (employee). Complexity: high — needs a new `Loan` model, EMI calculation logic, and a new controller/route/UI surface per role. Risk: interest/EMI math needs careful unit testing before it can be trusted.
- **Statement generation with PDF download** — opening/closing balance, credits, debits for a date range. Complexity: medium — needs a PDF library (e.g. `pdfkit`) added to `server/`, none installed today.
- **Automated tests** — currently zero. Complexity: medium to set up (Jest/Supertest for `server/`, Vitest + React Testing Library for `client/`), ongoing cost to maintain. See [TESTING.md](TESTING.md).
- **CI pipeline** — run tests + build on push. Complexity: low once tests exist; not worth adding before there's anything to run.

## Medium Priority
- **Staff-initiated deposits / deposit limits** — self-service deposit shipped 2026-08-16 (see [DECISIONS.md](DECISIONS.md)) as the simpler option; if this project ever needs to look more like a real bank, revisit toward staff/cash-counter-initiated deposits and/or a per-transaction or daily deposit cap. Complexity: low for a cap (one more validator), medium for staff-initiated (new employee-side UI flow).
- **Notifications** (in-app at minimum; email/SMS is a bigger lift) for transfer success/failure, loan approval, low balance. Complexity: medium — needs a delivery mechanism decision (poll vs. WebSocket vs. email provider).
- **"Update profile"** for customers (mentioned in the original brief, not built). Complexity: low.
- **Human-searchable transaction history** — search by counterparty account number or free-text description instead of only the internal `reference`. Complexity: low.
- **Admin user-list pagination** — currently unbounded `find()`. Complexity: low, same pattern as accounts/transactions already use.
- **Deployment** (Vercel + Render/Railway + Atlas per the brief). Complexity: medium — needs real accounts/credentials from the user, env var management, and CORS/domain config. Explicitly blocked until the user decides to pursue it.
- **Dependency vulnerability fixes** — `client/`'s 4 npm audit findings (react-router-dom, esbuild/vite). Complexity: low to medium depending on whether a breaking Vite major upgrade is acceptable.

## Low Priority
- **Dark mode**
- **Responsive polish beyond the single 768px breakpoint**
- **Toast-style notifications for UI actions** (currently inline success/error text only)
- **Account nickname / labeling** (currently only account number + type distinguish accounts in the UI)

## Experimental
*(Ideas from the brief's "bonus" list — unvalidated, may not be worth building for a portfolio project.)*

- QR code payments
- AI financial assistant
- Budget planning tools
- Multi-currency accounts
- Investment portfolio tracking
- Automatic bill payments
- Progressive Web App (PWA) packaging
- Real-time transaction monitoring via WebSockets
- Fraud detection via ML
- 2FA

None of these have dependencies decided or complexity estimated yet — they need a scoping pass before entering Medium/High priority.
