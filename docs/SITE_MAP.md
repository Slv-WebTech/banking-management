# Site Map

```
Application
├── / (Home — redirect only, no content of its own)
├── /login
├── /register
├── /dashboard          (Customer)
├── /employee           (Employee, also accessible to Admin)
├── /admin              (Admin only)
└── * (404 Not Found)
```

## Route Detail

### `/`
- **Page**: `App.jsx`'s inline `Home` component.
- **Purpose**: pure redirect — sends the visitor to `/login` (unauthenticated) or their role's dashboard (authenticated). Renders no UI of its own.
- **Access**: public (redirect logic runs for everyone).
- **API dependencies**: none directly (relies on `AuthContext` state already loaded).
- **Status**: IMPLEMENTED.

### `/login`
- **Page**: `pages/Login.jsx`.
- **Purpose**: authenticate an existing user.
- **Access**: public. Does not redirect away if already logged in (minor gap — a logged-in user can still navigate here and see the form, though submitting would just re-login).
- **Important components**: none beyond the page itself.
- **API dependencies**: `POST /api/auth/login`.
- **Status**: IMPLEMENTED.

### `/register`
- **Page**: `pages/Register.jsx`.
- **Purpose**: create a new `customer` account.
- **Access**: public.
- **API dependencies**: `POST /api/auth/register`.
- **Status**: IMPLEMENTED.

### `/dashboard`
- **Page**: `pages/CustomerDashboard.jsx`.
- **Purpose**: view/open accounts, deposit funds, transfer funds, view own transaction history.
- **Access**: `ProtectedRoute roles={['customer']}` — employees/admins are redirected to `/` (and from there to their own dashboard) if they somehow navigate here.
- **Important components**: `AccountCard`, `DepositForm`, `TransferForm`, `TransactionTable`.
- **API dependencies**: `GET /accounts/mine`, `POST /accounts`, `POST /transactions/deposit`, `POST /transactions/transfer`, `GET /transactions/mine`.
- **Status**: IMPLEMENTED.

### `/employee`
- **Page**: `pages/EmployeeDashboard.jsx`.
- **Purpose**: staff view of all customer accounts (searchable) and all transactions.
- **Access**: `ProtectedRoute roles={['employee', 'admin']}`.
- **Important components**: `TransactionTable` (with `showAccountColumn`).
- **API dependencies**: `GET /accounts/all`, `GET /transactions/all`.
- **Status**: IMPLEMENTED (view-only — no loan approval or request-handling UI, since those features don't exist yet).

### `/admin`
- **Page**: `pages/AdminDashboard.jsx`.
- **Purpose**: system report (counts/totals) + user management (search/filter, suspend/activate, role change).
- **Access**: `ProtectedRoute roles={['admin']}`.
- **API dependencies**: `GET /admin/report`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/role`.
- **Status**: IMPLEMENTED.

### `*` (404)
- **Page**: `pages/NotFound.jsx`.
- **Purpose**: catch-all for unmatched routes, with a link home.
- **Access**: public.
- **Status**: IMPLEMENTED.

## Not Yet a Route (planned)
- Account detail page (a `GET /accounts/:id` endpoint exists server-side but no frontend route/page calls it directly).
- Forgot-password flow.
- Loan application / tracking pages.
- Statement download page/action.

Keep this file in sync with `client/src/App.jsx` — if a route is added/removed there, update this table in the same change.
