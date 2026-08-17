# Project Style Guide

Derived from the patterns actually used in the initial scaffold. Follow these when extending the project instead of inventing new patterns.

## UI Style
- **Visual direction**: plain, functional, minimal — no design system or component library (no MUI/Tailwind/etc.), just hand-written CSS in `client/src/index.css`.
- **Color**: dark navy navbar (`#1a1a2e`), blue primary action color (`#2d5be3`), light gray page background (`#f4f6f9`), status badges use green/amber/red tints (`.badge-active` / `.badge-pending` / `.badge-closed`).
- **Typography**: system font stack (`-apple-system, 'Segoe UI', Roboto, sans-serif`), no custom web fonts.
- **Spacing**: cards use `20px` padding, `10px` border radius consistently (`.card`, `.account-card`, `.stat-card`).
- **Shadows**: one soft shadow recipe reused everywhere — `box-shadow: 0 2px 10px rgba(0,0,0,0.05–0.06)`.
- **Buttons**: `.btn` (solid blue primary), `.btn-secondary` (light gray), `.btn-link` (text-only, used for Logout). No icon buttons yet.
- **Forms**: label + input pairs wrapped in `.field`, stacked vertically. Native `<select>` for enums, no custom dropdown component.
- **Cards**: `.card` is the generic container; `.account-card` and `.stat-card` are specialized variants with the same visual language.
- **Navigation**: single top `Navbar`, no sidebar, no breadcrumbs — flat enough not to need them yet.
- **Tables**: plain HTML `<table>`, wrapped in `.table-wrap` for horizontal scroll on narrow screens. No virtualization (fine at current data volumes).
- **Modals**: none exist yet — no modal pattern established. If one is needed, establish the pattern deliberately rather than ad hoc.
- **Notifications**: inline `.error-text` / `.success-text` paragraphs per form, not toasts. No app-wide notification system (tracked in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).
- **Loading states**: a single `.page-loading` text block ("Loading...") per page during initial fetch. No skeletons/spinners.
- **Empty states**: short inline text (e.g. "You don't have any accounts yet.", "No transactions found") — keep this pattern for new empty states rather than inventing illustrations/components.
- **Error states**: same `.error-text` convention as form errors; table empty-state row doubles as the "no results" state for filtered views.
- **Responsive behavior**: one breakpoint at `768px` — navbar stacks vertically, account cards go full-width. `.account-grid`/`.stat-grid` use `auto-fill`/`auto-fit` grid so they naturally reflow without extra breakpoints.
- **Accessibility**: form inputs use paired `<label htmlFor>`/`id` (keep doing this for every new field). Not yet verified: color contrast ratios, focus-visible styling, `aria-live` on dynamic error/success text, keyboard navigation of the table pagination controls.
- **Animations/transitions**: none. Nothing to be consistent with yet — if adding motion, keep it minimal and purposeful.

## UX Style
- **Interaction patterns**: dashboards fetch their own data on mount (`useEffect` + `useCallback`) and re-fetch after a mutation (e.g., opening an account or completing a transfer immediately reloads the relevant list) rather than optimistic local updates.
- **Navigation principles**: role determines landing route (`/dashboard`, `/employee`, `/admin`) computed in `App.jsx`'s `Home` component and `Navbar`'s `dashboardPath`. Keep these two in sync if adding a role or changing routes.
- **Feedback patterns**: every mutating action (open account, transfer, suspend user, etc.) shows a disabled-button "in progress" label (e.g. "Transferring...", "Opening...") rather than a separate spinner component.
- **Error handling UX**: API error messages are read from `err.response?.data?.message` and shown verbatim — the backend is expected to send human-readable `message` strings (it does, consistently, via `errorHandler` and controller-level `res.status(x).json({message: ...})`). Keep that contract when adding new endpoints.
- **Confirmation behavior**: none implemented yet (e.g., suspending a user or transferring funds has no "are you sure?" step). Worth adding for destructive/high-stakes actions (user suspension, account closure) before this is a real product.
- **Mobile behavior**: functional via the single breakpoint; not deeply optimized (tables scroll horizontally rather than reflowing to cards on mobile).

## Code Style
- **Naming conventions**: camelCase for variables/functions, PascalCase for React components and Mongoose models, kebab-case is not used anywhere (files are camelCase/PascalCase, not `kebab-case.js`).
- **File naming**: one component/controller/model per file, filename matches the exported name (`AccountCard.jsx` exports `AccountCard`, `accountController.js` exports the account controller functions).
- **Folder conventions**: backend follows `models/ → middleware/ → controllers/ → routes/` layering; frontend follows `components/` (reusable/presentational) vs. `pages/` (route-level, own data fetching) vs. `context/` (cross-cutting state) vs. `api/` (HTTP client setup).
- **Function conventions**: backend controller functions are plain `async function name(req, res) {}` (named, not arrow, not default-exported individually — grouped and exported as an object at the bottom of each controller file). Route files wrap every controller in `asyncHandler(...)` — **do not add a new route without this wrapper**, or thrown errors in that handler will crash the process instead of reaching `errorHandler`.
- **State management patterns**: local `useState`/`useEffect` per page; `AuthContext` is the only cross-cutting context. Don't reach for Redux/Zustand unless state genuinely needs to be shared across more than 2–3 components — it doesn't yet.
- **API patterns**: REST, one router file per resource (`authRoutes`, `accountRoutes`, `transactionRoutes`, `adminRoutes`), mounted under `/api/<resource>` in `server.js`. Validation via `express-validator` arrays declared inline in the route definition, checked by the shared `validate` middleware. Follow this shape for new resources rather than validating inside the controller.
- **Error handling**: controllers throw/reject and let `asyncHandler` + `errorHandler` deal with it; they don't try/catch internally except where a specific status code needs custom handling (e.g. insufficient balance → `400` with a specific message).
- **Validation**: `express-validator` at the route layer for auth and transfers; ad hoc manual checks in controllers for simpler cases (e.g. `accountController.js` checking `accountType`). If a new endpoint takes user input beyond a simple enum, prefer adding `express-validator` rules over manual `if` checks, to match the established pattern.
- **Comments**: none in the current codebase by design — code is written to be self-explanatory via naming. Keep it that way; only add a comment for a genuinely non-obvious constraint (e.g. the compensating-refund comment in `transactionController.js` explaining *why*, not *what*).
- **Logging**: `console.log`/`console.error` only, no framework. Server start and DB connection log on boot; errors log via `errorHandler`. Don't add `console.log` debugging statements that would ship to production — remove them before considering a change done.
- **Testing conventions**: none established yet — see [TESTING.md](TESTING.md) for the intended approach when tests are introduced.
