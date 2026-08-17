# Project Score

Assessment as of **2026-08-17 (post-test-suite)**. History: 5.4/10 immediately after scaffold (pre-verification), 5.7/10 after the first live verification pass on 2026-08-14 (found the funding gap), 5.9/10 after the deposit feature closed that gap on 2026-08-16. See [CHANGELOG.md](CHANGELOG.md) for those checkpoints. Scores are not inflated — several categories are still low because the corresponding work genuinely hasn't happened (deployment, CI, full test coverage). Re-score after each major milestone rather than adjusting old numbers in place.

| Category | Score /10 | Change | Reasoning |
|---|---|---|---|
| Architecture | 8 | +1 | The `server.js` → `app.js`/`server.js` split (extracting the Express app from its listen/connect side effects) is a genuine, standard improvement — the app is now testable in isolation, not just runnable. |
| Code quality | 7 | — | Unchanged. |
| Maintainability | 8 | +1 | The reasoning that kept this capped ("undermined by zero automated tests") no longer applies — real regression protection now exists for the highest-risk logic. |
| UI/UX | 5 | — | Unchanged. |
| Accessibility | 4 | — | Unchanged — not specifically tested this pass. |
| Performance | 6 | — | Unchanged. |
| Security | 6 | — | Unchanged — same open gaps as before (no HTTPS in-repo, no 2FA, unpatched audit findings). |
| Testing | 7 | +2 | Was 5. A real automated suite exists now — 32 backend tests (Jest/Supertest/`mongodb-memory-server`) and 21 frontend tests (Vitest/RTL), covering transfer/deposit atomicity and idempotency, auth/suspension/authorization boundaries, and a dedicated regression test for the type-label bug found on 2026-08-16. Not higher than 7, because real, documented gaps remain: no CI to actually run these automatically, no coverage reporting, `TransferForm.jsx` and the page components untested, no e2e. See [TESTING.md](TESTING.md). |
| Documentation | 8 | — | Unchanged — kept accurate and current through every pass so far, which is the point. |
| Scalability | 4 | — | Unchanged. |
| Developer experience | 7 | +1 | `npm test` now exists in both `client/` and `server/`, with a documented, standard pattern (per-file isolated in-memory MongoDB) that the next contributor can extend without re-deriving the approach. |
| Error handling | 7 | — | Unchanged — the test suite confirmed existing error-handling behavior rather than revealing anything new about it. |
| Responsive design | 6 | — | Unchanged. |
| Feature completeness | 5 | — | Unchanged — testing verifies what exists works correctly, it doesn't add new user-facing capability. Still reflects "the Core MVP works," not "the Core MVP is the whole original brief." |

## Overall Health Score: **6.3 / 10**
(Simple mean of the above 14 categories. History: 5.4 → 5.7 → 5.9 → 6.3.)

**Read this as**: the biggest single jump so far, and it came from adding real regression protection rather than from verifying more things by hand — a qualitatively different kind of progress than the previous three checkpoints. The pattern across all four scores still holds: every point gained here was earned by something concrete (a test that runs and passes, a refactor that makes testing possible), never by re-describing existing code more favorably. What's still holding the overall score back is almost entirely "hasn't been done yet, not hidden" — no CI, no deployment, no full brief coverage — which is a healthy place for an honest scorecard to be.

## Update This When
- CI is set up (Testing/Developer experience should move further once the suite runs on every push, not just when someone remembers).
- The automated-suite gaps close (`TransferForm.jsx`, page components, coverage reporting).
- Deployment happens (unlocks a real Performance/Security assessment instead of a local-machine test).
- Loans, statements, or notifications are built (Feature completeness moves toward the full original brief, not just the Core MVP).
