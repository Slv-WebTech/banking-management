const request = require('supertest');
const app = require('../app');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const escapeRegex = require('../utils/escapeRegex');
const { parseAmount } = require('../utils/money');
const {
  registerUser,
  openAccount,
  deposit,
  createUserWithRole,
  applyForLoan,
  approveLoan,
} = require('./helpers');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('utils', () => {
  test('escapeRegex neutralises regex metacharacters', () => {
    expect(escapeRegex('a.b(c)*')).toBe(String.raw`a\.b\(c\)\*`);
  });

  test('parseAmount rejects bad values and rounds to cents', () => {
    expect(parseAmount('10.5')).toBe(10.5);
    expect(parseAmount(0)).toBeNull();
    expect(parseAmount(-1)).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount(1.005)).toBeNull(); // 3 decimals
    expect(parseAmount(1e12)).toBeNull(); // above cap
  });
});

describe('input hardening', () => {
  test('regex metacharacters in search do not error', async () => {
    const admin = await createUserWithRole(app, 'admin');
    for (const url of ['/api/admin/users?search=(', '/api/accounts/all?search=[', '/api/transactions/all?search=*(']) {
      const res = await request(app).get(url).set(auth(admin.token));
      expect(res.status).toBe(200);
    }
  });

  test('deposit rejects >2 decimals and amounts above the deposit cap', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    expect((await deposit(app, token, { account: account._id, amount: 1.234 })).status).toBe(400);
    expect((await deposit(app, token, { account: account._id, amount: 100000000 })).status).toBe(400);
    expect((await deposit(app, token, { account: account._id, amount: 99.99 })).status).toBe(201);
  });
});

describe('idempotency under concurrency', () => {
  test('concurrent deposits with the same clientRef credit once', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => deposit(app, token, { account: account._id, amount: 100, clientRef: 'dup-1' }))
    );
    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    const fresh = await Account.findById(account._id);
    expect(fresh.balance).toBe(100);
    expect(await Transaction.countDocuments({ account: account._id, clientRef: 'dup-1' })).toBe(1);
  });
});

describe('loans: atomicity and maker-checker', () => {
  async function pendingLoan() {
    const customer = await registerUser(app);
    const account = await openAccount(app, customer.token);
    const employee = await createUserWithRole(app, 'employee');
    const loan = (await applyForLoan(app, customer.token, { disbursalAccount: account._id, principal: 1200, termMonths: 12 })).body;
    return { customer, account, employee, loan };
  }

  test('concurrent approvals disburse exactly once', async () => {
    const { account, employee, loan } = await pendingLoan();
    const results = await Promise.all([1, 2, 3].map(() => approveLoan(app, employee.token, loan._id)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const fresh = await Account.findById(account._id);
    expect(fresh.balance).toBe(1200);
    expect(await Transaction.countDocuments({ account: account._id, type: 'loan-disbursement' })).toBe(1);
  });

  test('concurrent payments of the same installment debit once', async () => {
    const { customer, account, employee, loan } = await pendingLoan();
    await approveLoan(app, employee.token, loan._id, 0);
    await deposit(app, customer.token, { account: account._id, amount: 5000 });
    const before = (await Account.findById(account._id)).balance;
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        request(app).post(`/api/loans/${loan._id}/pay`).set(auth(customer.token)).send({ account: account._id })
      )
    );
    // Each request targets whichever installment is currently Due; no installment is paid twice.
    const paid = results.filter((r) => r.status === 201).length;
    const after = (await Account.findById(account._id)).balance;
    expect(after).toBe(before - paid * 100);
    expect(await Transaction.countDocuments({ account: account._id, type: 'loan-repayment' })).toBe(paid);
  });

  test('a staff member cannot approve or reject their own loan', async () => {
    const employee = await createUserWithRole(app, 'employee');
    const account = await openAccount(app, employee.token);
    const loan = (await applyForLoan(app, employee.token, { disbursalAccount: account._id, principal: 1000, termMonths: 6 })).body;
    expect((await approveLoan(app, employee.token, loan._id)).status).toBe(403);
    const rej = await request(app).patch(`/api/loans/${loan._id}/reject`).set(auth(employee.token)).send({});
    expect(rej.status).toBe(403);
  });
});

describe('accounts and admin guards', () => {
  test('staff cannot approve closure of their own account', async () => {
    const employee = await createUserWithRole(app, 'employee');
    const account = await openAccount(app, employee.token);
    await request(app).post(`/api/accounts/${account._id}/request-closure`).set(auth(employee.token));
    const res = await request(app).post(`/api/accounts/${account._id}/approve-closure`).set(auth(employee.token));
    expect(res.status).toBe(403);
  });

  test('closure can only be requested for an Active account', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    await request(app).post(`/api/accounts/${account._id}/request-closure`).set(auth(token));
    const again = await request(app).post(`/api/accounts/${account._id}/request-closure`).set(auth(token));
    expect(again.status).toBe(400);
  });

  test('an admin cannot change their own role or status', async () => {
    const admin = await createUserWithRole(app, 'admin');
    const role = await request(app).patch(`/api/admin/users/${admin.user.id}/role`).set(auth(admin.token)).send({ role: 'customer' });
    const status = await request(app).patch(`/api/admin/users/${admin.user.id}/status`).set(auth(admin.token)).send({ status: 'suspended' });
    expect(role.status).toBe(400);
    expect(status.status).toBe(400);
    expect((await User.findById(admin.user.id)).role).toBe('admin');
  });
});
