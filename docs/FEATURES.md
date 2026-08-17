# Feature Inventory

Status values: `IMPLEMENTED`, `PARTIALLY_IMPLEMENTED`, `PLANNED`, `BLOCKED`. As of 2026-08-16, every `IMPLEMENTED` row below has been manually verified live (real MongoDB, real HTTP/browser interaction) — see [TESTING.md](TESTING.md) for the exact results.

| Feature | Status | Related Pages | Related APIs | Related Components |
|---|---|---|---|---|
| User registration | IMPLEMENTED | Register | `POST /auth/register` | `Register.jsx`, `AuthContext` |
| Login (JWT) | IMPLEMENTED | Login | `POST /auth/login` | `Login.jsx`, `AuthContext` |
| Session restore (`/me`) | IMPLEMENTED | all | `GET /auth/me` | `AuthContext` |
| Role-based routing | IMPLEMENTED | all | — | `ProtectedRoute.jsx`, `App.jsx` |
| Open new account | IMPLEMENTED | CustomerDashboard | `POST /accounts` | `CustomerDashboard.jsx` |
| View my accounts | IMPLEMENTED | CustomerDashboard | `GET /accounts/mine` | `AccountCard.jsx` |
| View account by id | IMPLEMENTED | — (no dedicated detail page yet) | `GET /accounts/:id` | — |
| Request account closure | PARTIALLY_IMPLEMENTED | — (no UI wired to this endpoint yet) | `POST /accounts/:id/request-closure` | — |
| Staff approve/finalize closure | PLANNED | — | — | — |
| Fund transfer | IMPLEMENTED | CustomerDashboard | `POST /transactions/transfer` | `TransferForm.jsx` |
| Transfer idempotency | IMPLEMENTED | CustomerDashboard | `POST /transactions/transfer` (`clientRef`) | `TransferForm.jsx` |
| My transaction history (search/filter/paginate) | IMPLEMENTED | CustomerDashboard | `GET /transactions/mine` | `TransactionTable.jsx` |
| Employee: view all customer accounts | IMPLEMENTED | EmployeeDashboard | `GET /accounts/all` | `EmployeeDashboard.jsx` |
| Employee: view all transactions | IMPLEMENTED | EmployeeDashboard | `GET /transactions/all` | `TransactionTable.jsx` |
| Employee: approve/reject loans | PLANNED | — | — | — |
| Employee: handle customer requests | PLANNED | — | — | — |
| Admin: manage users (search/filter) | IMPLEMENTED | AdminDashboard | `GET /admin/users` | `AdminDashboard.jsx` |
| Admin: suspend/activate user | IMPLEMENTED | AdminDashboard | `PATCH /admin/users/:id/status` | `AdminDashboard.jsx` |
| Admin: change user role | IMPLEMENTED | AdminDashboard | `PATCH /admin/users/:id/role` | `AdminDashboard.jsx` |
| Admin: system report | IMPLEMENTED | AdminDashboard | `GET /admin/report` | `AdminDashboard.jsx` |
| Admin: bootstrap first admin account | IMPLEMENTED | — (CLI only) | `server/scripts/seedAdmin.js` | — |
| Fund an account (deposit) | IMPLEMENTED | CustomerDashboard | `POST /transactions/deposit` | `DepositForm.jsx` |
| Loan application / EMI / approval | PLANNED | — | — | — |
| Statement generation / PDF download | PLANNED | — | — | — |
| Notifications (any channel) | PLANNED | — | — | — |
| Dark mode | PLANNED | — | — | — |
| QR code payments | PLANNED | — | — | — |
| Multi-currency accounts | PLANNED | — | — | — |
| 2FA | PLANNED | — | — | — |
| Automated tests | PLANNED | — | — | — |
| CI/CD | PLANNED | — | — | — |
| Deployment | PLANNED | — | — | — |

For the full deferred list with priority/complexity, see [FUTURE_FEATURES.md](FUTURE_FEATURES.md). For verification status of the IMPLEMENTED rows, see [IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md) — "implemented" here means "the code exists and loads," not "manually verified in a browser against a live database."
