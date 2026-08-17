# Documentation Index

This `/docs` directory is the durable knowledge base for this project — it should let a new developer or AI agent continue the work without reading the entire codebase or this conversation. Keep it synchronized with the code; see each file's own notes on when to update it.

**Start here if you're new to this project**: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), then [DEV_CONTEXT.md](DEV_CONTEXT.md) for exactly where things stand right now.

| File | What it's for |
|---|---|
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | What this project is, who it's for, current status, stack, terminology |
| [DEV_CONTEXT.md](DEV_CONTEXT.md) | Live "state of the union" — read this first when resuming work |
| [PROJECT_PLAN.md](PROJECT_PLAN.md) | Roadmap: Completed / In Progress / Next / Later / Blocked |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system is built — frontend, backend, data flow, security boundaries |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Every endpoint: method, auth, body, response |
| [DATABASE.md](DATABASE.md) | Collections, fields, relationships, indexes, consistency model |
| [SITE_MAP.md](SITE_MAP.md) | Every frontend route and what it does |
| [FEATURES.md](FEATURES.md) | Full feature inventory with status |
| [IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md) | What's actually built, verified against the code, with known limitations |
| [FUTURE_FEATURES.md](FUTURE_FEATURES.md) | Backlog, prioritized — not to be built without an explicit request |
| [PROJECT_STYLE.md](PROJECT_STYLE.md) | UI, UX, and code conventions to follow for new work |
| [PROJECT_SCORE.md](PROJECT_SCORE.md) | Honest quality scorecard across 14 categories |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | Known gaps and shortcuts, ranked by priority |
| [DECISIONS.md](DECISIONS.md) | ADR-style log of why things were built the way they were |
| [TESTING.md](TESTING.md) | The automated test suite (what it covers, how to run it), plus the manual-verification history that seeded it |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Planned deployment targets and what's needed to get there (not deployed yet) |
| [CHANGELOG.md](CHANGELOG.md) | Dated history of what changed and why |
| [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) | How to talk about this project in an interview — honestly scoped to what's actually been built/tested |

## Maintenance Rule
After any meaningful development session: update [DEV_CONTEXT.md](DEV_CONTEXT.md) and [CHANGELOG.md](CHANGELOG.md) at minimum, plus whichever other files the change actually affects ([FEATURES.md](FEATURES.md)/[IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md) for feature work, [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)/[DECISIONS.md](DECISIONS.md) for trade-offs, [PROJECT_SCORE.md](PROJECT_SCORE.md) when quality materially changes). Don't update files a change didn't actually touch — that just adds noise.
