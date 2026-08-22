const request = require('supertest');
const User = require('../models/User');

async function registerUser(app, overrides = {}) {
  const payload = {
    name: 'Test User',
    email: `user${Date.now()}${Math.random().toString(16).slice(2)}@example.com`,
    password: 'Password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { token: res.body.token, user: res.body.user, response: res };
}

async function openAccount(app, token, accountType = 'Savings') {
  const res = await request(app)
    .post('/api/accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ accountType });
  return res.body;
}

async function deposit(app, token, { account, amount, clientRef, description }) {
  return request(app)
    .post('/api/transactions/deposit')
    .set('Authorization', `Bearer ${token}`)
    .send({ account, amount, clientRef, description });
}

// Promotes a freshly-registered user straight to a given role via a direct DB
// write (mirroring what scripts/seedAdmin.js does for admins), so tests don't
// depend on the CLI script or on an existing admin to promote someone.
// Returns the original pre-promotion token deliberately: protect() re-checks
// role from the DB on every request, so this token should already work.
async function createUserWithRole(app, role, overrides = {}) {
  const { token, user } = await registerUser(app, overrides);
  await User.findByIdAndUpdate(user.id, { role });
  return { token, user: { ...user, role } };
}

async function applyForLoan(app, token, { disbursalAccount, principal, termMonths, purpose }) {
  return request(app)
    .post('/api/loans')
    .set('Authorization', `Bearer ${token}`)
    .send({ disbursalAccount, principal, termMonths, purpose });
}

async function approveLoan(app, token, loanId, annualInterestRate = 12) {
  return request(app)
    .patch(`/api/loans/${loanId}/approve`)
    .set('Authorization', `Bearer ${token}`)
    .send({ annualInterestRate });
}

module.exports = {
  registerUser,
  openAccount,
  deposit,
  createUserWithRole,
  applyForLoan,
  approveLoan,
};
