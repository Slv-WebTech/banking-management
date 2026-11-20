# Feature Inventory

Status values: `IMPLEMENTED`, `PARTIALLY_IMPLEMENTED`, `PLANNED`, `BLOCKED`. As of 2026-11-20, every `IMPLEMENTED` row has been exercised live in a real browser against a real MongoDB (the original MVP on 2026-08-14/16; everything since, including loans, closure approval and the redesign, in the 2026-11-20 QA pass — see [QA-REPORT.md](QA-REPORT.md) and [TESTING.md](TESTING.md)).

| Feature | Status | Related Pages | Related APIs | Related Components |
|---|---|---|---|---|
| User registration | IMPLEMENTED | Register | `POST /auth/register` | `Register.jsx`, `AuthContext` |
| Login (JWT) | IMPLEMENTED | Login | `POST /auth/login` | `Login.jsx`, `AuthContext` |
| Session restore (`/me`) | IMPLEMENTED | all | `GET /auth/me` | `AuthContext` |
| Role-based routing | IMPLEMENTED | all | — | `ProtectedRoute.jsx`, `App.jsx` |
| Open new account | IMPLEMENTED | CustomerDashboard | `POST /accounts` | `CustomerDashboard.jsx` |
| View my accounts | IMPLEMENTED | CustomerDashboard | `GET /accounts/mine` | `AccountCard.jsx` |
| View account by id | IMPLEMENTED | — (no dedicated detail page yet) | `GET /accounts/:id` | — |
| Request account closure | IMPLEMENTED | CustomerDashboard | `POST /accounts/:id/request-closure` | `AccountCard.jsx` |
| Staff approve/reject closure *(2026-08-22)* | IMPLEMENTED | EmployeeDashboard ("Pending Closures" queue) | `POST /accounts/:id/approve-closure`, `POST /accounts/:id/reject-closure` | `EmployeeDashboard.jsx` |
| Fund transfer | IMPLEMENTED | CustomerDashboard | `POST /transactions/transfer` | `TransferForm.jsx` |
| Transfer idempotency | IMPLEMENTED | CustomerDashboard | `POST /transactions/transfer` (`clientRef`) | `TransferForm.jsx` |
| My transaction history (search/filter/paginate) | IMPLEMENTED | CustomerDashboard | `GET /transactions/mine` | `TransactionTable.jsx` |
| Human-searchable transaction search *(2026-08-22)* — matches description/counterparty account number, not just the internal reference | IMPLEMENTED | CustomerDashboard, EmployeeDashboard | `GET /transactions/mine`, `GET /transactions/all` (`search` param) | `TransactionTable.jsx` |
| Employee: view all customer accounts | IMPLEMENTED | EmployeeDashboard | `GET /accounts/all` | `EmployeeDashboard.jsx` |
| Employee: view all transactions | IMPLEMENTED | EmployeeDashboard | `GET /transactions/all` | `TransactionTable.jsx` |
| Employee: approve/reject loans *(2026-08-22)* | IMPLEMENTED | EmployeeDashboard ("Loan Applications" queue) | `PATCH /loans/:id/approve`, `PATCH /loans/:id/reject` | `EmployeeDashboard.jsx` |
| Employee: handle customer requests | IMPLEMENTED | EmployeeDashboard | See closure-approval and loan-approval rows above | `EmployeeDashboard.jsx` |
| Admin: manage users (search/filter) | IMPLEMENTED | AdminDashboard | `GET /admin/users` | `AdminDashboard.jsx` |
| Admin: suspend/activate user | IMPLEMENTED | AdminDashboard | `PATCH /admin/users/:id/status` | `AdminDashboard.jsx` |
| Admin: change user role | IMPLEMENTED | AdminDashboard | `PATCH /admin/users/:id/role` | `AdminDashboard.jsx` |
| Admin: system report | IMPLEMENTED | AdminDashboard | `GET /admin/report` | `AdminDashboard.jsx` |
| Admin: bootstrap first admin account | IMPLEMENTED | — (CLI only) | `server/scripts/seedAdmin.js` | — |
| Fund an account (deposit) | IMPLEMENTED | CustomerDashboard | `POST /transactions/deposit` | `DepositForm.jsx` |
| Loan application / EMI / approval / repayment *(2026-08-22)* | IMPLEMENTED | CustomerLoans, EmployeeDashboard | `POST /loans`, `GET /loans/mine`, `GET /loans/all`, `GET /loans/:id`, `PATCH /loans/:id/approve`, `PATCH /loans/:id/reject`, `POST /loans/:id/pay` | `CustomerLoans.jsx`, `EmployeeDashboard.jsx` |
| Statement generation / PDF download | PLANNED | — | — | — |
| Notifications (any channel) | PLANNED | — | — | — |
| Dark mode | PLANNED | — | — | — |
| QR code payments | PLANNED | — | — | — |
| Multi-currency accounts | PLANNED | — | — | — |
| 2FA | PLANNED | — | — | — |
| Automated tests | IMPLEMENTED | — | — | `server/tests/`, `client/src/**/*.test.jsx` (108 server + 28 client tests as of 2026-11-20) |
| CI/CD | IMPLEMENTED *(code exists, unverified by a real run)* | — | — | `.github/workflows/ci.yml` |
| Deployment | PLANNED | — | — | — |

For the full deferred list with priority/complexity, see [FUTURE_FEATURES.md](FUTURE_FEATURES.md). For verification status of the IMPLEMENTED rows, see [IMPLEMENTED_FEATURES.md](IMPLEMENTED_FEATURES.md) — "implemented" here means "the code exists and loads (and, since 2026-08-17, passes its automated tests)," not "manually verified in a browser against a live database" unless stated otherwise.
