const request = require('supertest');
const app = require('../app');
const Account = require('../models/Account');
const { registerUser, openAccount, createUserWithRole } = require('./helpers');

describe('Accounts', () => {
  test('a customer can open an account with a unique 10-digit number and zero balance', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);

    expect(account.accountNumber).toMatch(/^\d{10}$/);
    expect(account.balance).toBe(0);
    expect(account.status).toBe('Active');
  });

  test('GET /accounts/mine only returns the caller\'s own accounts', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    await openAccount(app, alice.token);
    await openAccount(app, bob.token);

    const res = await request(app).get('/api/accounts/mine').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('a customer cannot view another customer\'s account by id', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const aliceAccount = await openAccount(app, alice.token);

    const res = await request(app)
      .get(`/api/accounts/${aliceAccount._id}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(403);
  });

  test('a customer cannot list all accounts', async () => {
    const { token } = await registerUser(app);
    const res = await request(app).get('/api/accounts/all').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('an employee can list all accounts with owner populated', async () => {
    const customer = await registerUser(app, { email: 'customer@example.com' });
    await openAccount(app, customer.token);
    const employee = await createUserWithRole(app, 'employee');

    const res = await request(app).get('/api/accounts/all').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].owner.email).toBe('customer@example.com');
  });

  test('requesting closure on an account with a non-zero balance is rejected', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    await Account.findByIdAndUpdate(account._id, { balance: 100 });

    const res = await request(app)
      .post(`/api/accounts/${account._id}/request-closure`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test('requesting closure on a zero-balance account sets it to PendingClosure', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);

    const res = await request(app)
      .post(`/api/accounts/${account._id}/request-closure`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PendingClosure');
  });
});
