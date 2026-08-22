# Banking Management System

A full-stack banking application (React + Node.js/Express + MongoDB) with JWT authentication, role-based access control (customer/employee/admin), account deposits, fund transfers, transaction history, staff account-closure approval, and loan management.

**Project status**: Core MVP fully usable end-to-end since 2026-08-16 — a brand-new user can register, deposit into their own account, transfer funds, and view history entirely through the UI, no manual database steps required.

As of 2026-08-22:
- **Frontend redesign**: the entire UI received a full visual/UX overhaul — new design system (color/type/spacing tokens), a sticky app header with role-aware navigation, a full-bleed split-screen auth flow, dark "bank card"-style account cards, consolidated Deposit/Transfer tabs, skeleton loading and empty states throughout. `vite build` succeeds and all 21 client tests pass; Login, Register, and 404 were spot-checked live in a browser. The three authenticated dashboards have **not** been re-verified live yet (needs a running MongoDB instance).
- **New backend features** (full test coverage — 66 server tests, up from 32 — **backend + tests only, no frontend UI yet** for any of these three):
  - Staff approval/rejection of pending account-closure requests (`POST /api/accounts/:id/approve-closure`, `.../reject-closure`) — completes the previously partial closure flow.
  - Broader transaction search — matches free-text description or a counterparty's account number, not just the internal `reference`.
  - **Loan management**: customers apply for a loan against one of their accounts; staff approve (setting the interest rate, which disburses the principal and generates a reducing-balance EMI schedule) or reject; customers repay installments, closing the loan once fully paid. See `server/utils/loanSchedule.js` for the amortization math (independently unit-tested) and `server/controllers/loanController.js` / `server/routes/loanRoutes.js` for the API.
- **CI**: a GitHub Actions pipeline (`.github/workflows/ci.yml`) now runs both test suites + the client build on push/PR to `main` — not yet verified by an actual run.

Not deployed. See [`docs/DEV_CONTEXT.md`](docs/DEV_CONTEXT.md) for exactly where things stand and [`docs/README.md`](docs/README.md) for the full documentation index.

## Stack
- **Frontend**: React 18, Vite, React Router
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + bcrypt

## Project Structure
```
banking-management/
├── client/     React SPA
├── server/     Express REST API
└── docs/       Architecture, decisions, plan, and status docs — read these first
```

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB instance (local `mongod`, or a MongoDB Atlas connection string)

### Backend
```
cd server
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET
npm run dev
```
Runs on `http://localhost:5000`.

### Frontend
```
cd client
npm install
cp .env.example .env   # defaults to http://localhost:5000/api, edit if needed
npm run dev
```
Runs on `http://localhost:5173`.

### First Admin User
Register a normal account via the UI, then promote it:
```
cd server
npm run seed:admin -- your@email.com
```

### Tests
```
cd server && npm test    # Jest + Supertest + mongodb-memory-server
cd client && npm test    # Vitest + React Testing Library
```
See [`docs/TESTING.md`](docs/TESTING.md) for exactly what's covered and what isn't yet.

## Documentation
Full project context, architecture, API reference, decisions, known gaps, and roadmap live in [`/docs`](docs/README.md). Start with [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md).
