# Deployment

## Current Status: Not Deployed
Nothing in this project has been deployed anywhere. This document records the *planned* approach from the original project brief, and what's needed to get there — not a description of a live system.

## Planned Targets (per original brief)
| Component | Target | Status |
|---|---|---|
| `client/` | Vercel | Not configured |
| `server/` | Render or Railway | Not configured |
| Database | MongoDB Atlas | Not configured — local dev currently assumes a local `mongod` via `MONGO_URI` |

## Environment Variables Needed
### `server/.env` (see `server/.env.example`)
- `PORT` — defaults to 5000
- `NODE_ENV` — `development` | `production`
- `MONGO_URI` — connection string (would become an Atlas SRV URI in production)
- `JWT_SECRET` — **must** be replaced with a long random value in any real deployment; the example file contains a placeholder, not a usable secret
- `JWT_EXPIRES_IN` — defaults to `7d`
- `CLIENT_URL` — used for the `cors` origin allowlist; must match the deployed frontend's real URL in production
- `MAX_DEPOSIT_AMOUNT` / `MAX_TRANSACTION_AMOUNT` — per-request caps (defaults 100000 / 10000000)
- `MAX_PENDING_LOANS` — pending loan applications allowed per borrower (default 3)
- `TRUST_PROXY` — set to `1` behind a reverse proxy so the per-IP auth limiter sees real client IPs
- Set `NODE_ENV=production` in any real deployment: stack traces are only returned when it is `development`, and 5xx messages are masked in production

### `client/.env` (see `client/.env.example`)
- `VITE_API_URL` — must point at the deployed backend's `/api` base URL, not `localhost`, in production.

## Before This Can Be Deployed
1. Real MongoDB Atlas cluster + connection string (user-provided).
2. Hosting accounts for Vercel and Render/Railway (user-provided).
3. A generated production `JWT_SECRET` (not the placeholder).
4. `CLIENT_URL`/`VITE_API_URL` set to the real deployed domains on both sides — `cors` will reject the frontend's requests otherwise.
5. Decide on HTTPS — both Vercel and Render/Railway terminate TLS automatically, so this is likely satisfied "for free" by the hosting choice, but has not been verified since nothing is deployed yet.
6. Ideally: the "Next" steps in [PROJECT_PLAN.md](PROJECT_PLAN.md) (real local testing, admin bootstrap) completed first, so what gets deployed has actually been exercised once.

## CI/CD
A CI workflow exists as of 2026-08-22 (`.github/workflows/ci.yml`, GitHub Actions) — it runs the server test suite, the client test suite, and the client production build on every push/PR to `main`. It has **not yet executed against a real push**, so its actual pass/fail status is unverified — treat it as untested infrastructure until it runs once for real. No auto-deploy hooks exist or are planned until an actual hosting target is chosen (see "Before This Can Be Deployed" above) — CI currently only verifies the code, it does not ship it anywhere.

## Rollback Plan
N/A — nothing deployed yet. Define this when the first deployment happens.
