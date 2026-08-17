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
None exists. No GitHub Actions workflow, no auto-deploy hooks. Not worth setting up before there's a test suite for it to run (see [TESTING.md](TESTING.md)) and before the project is even in a git repository (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) item 4).

## Rollback Plan
N/A — nothing deployed yet. Define this when the first deployment happens.
