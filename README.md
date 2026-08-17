# Banking Management System

A full-stack banking application (React + Node.js/Express + MongoDB) with JWT authentication, role-based access control (customer/employee/admin), account deposits, fund transfers, and transaction history.

**Project status**: fully usable end-to-end as of 2026-08-16 — a brand-new user can register, deposit into their own account, transfer funds, and view history entirely through the UI, no manual database steps required. Verified live against a real database on both 2026-08-14 (Core MVP) and 2026-08-16 (deposit feature). As of 2026-08-17, also has an automated test suite (53 tests) covering the highest-risk logic. Not deployed, no CI yet. See [`docs/DEV_CONTEXT.md`](docs/DEV_CONTEXT.md) for exactly where things stand and [`docs/README.md`](docs/README.md) for the full documentation index.

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
