const request = require('supertest');
const app = require('../app');
const { registerUser, openAccount, deposit } = require('./helpers');

describe('Deposits', () => {
  test('a positive deposit credits the account with the correct balanceAfter', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);

    const res = await deposit(app, token, { account: account._id, amount: 500 });
    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe('deposit');
    expect(res.body.transaction.balanceAfter).toBe(500);
  });

  test('a zero or negative deposit amount is rejected', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);

    const res = await deposit(app, token, { account: account._id, amount: -10 });
    expect(res.status).toBe(400);
  });

  test('a duplicate deposit (same clientRef) is not double-processed', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);

    const first = await deposit(app, token, { account: account._id, amount: 500, clientRef: 'dep-1' });
    const second = await deposit(app, token, { account: account._id, amount: 500, clientRef: 'dep-1' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.transaction._id).toBe(first.body.transaction._id);

    const accounts = await request(app).get('/api/accounts/mine').set('Authorization', `Bearer ${token}`);
    expect(accounts.body[0].balance).toBe(500);
  });

  test('a customer cannot deposit into an account they do not own', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const bobAccount = await openAccount(app, bob.token);

    const res = await deposit(app, alice.token, { account: bobAccount._id, amount: 100 });
    expect(res.status).toBe(403);
  });
});

describe('Transfers', () => {
  async function setupFundedPair(fundAmount = 1000) {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const aliceAccount = await openAccount(app, alice.token);
    const bobAccount = await openAccount(app, bob.token);
    if (fundAmount > 0) {
      await deposit(app, alice.token, { account: aliceAccount._id, amount: fundAmount });
    }
    return { alice, bob, aliceAccount, bobAccount };
  }

  test('a transfer with insufficient balance is rejected and leaves the source untouched', async () => {
    const { alice, aliceAccount, bobAccount } = await setupFundedPair(0);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ fromAccount: aliceAccount._id, toAccountNumber: bobAccount.accountNumber, amount: 100 });

    expect(res.status).toBe(400);

    const accounts = await request(app)
      .get('/api/accounts/mine')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(accounts.body[0].balance).toBe(0);
  });

  test('a successful transfer produces correct balances and a matching ledger pair', async () => {
    const { alice, bob, aliceAccount, bobAccount } = await setupFundedPair(1000);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ fromAccount: aliceAccount._id, toAccountNumber: bobAccount.accountNumber, amount: 300 });

    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe('transfer-debit');
    expect(res.body.transaction.balanceAfter).toBe(700);

    const aliceHistory = await request(app)
      .get('/api/transactions/mine')
      .set('Authorization', `Bearer ${alice.token}`);
    const bobHistory = await request(app)
      .get('/api/transactions/mine')
      .set('Authorization', `Bearer ${bob.token}`);

    expect(aliceHistory.body.items[0].reference).toBe(bobHistory.body.items[0].reference);
    expect(bobHistory.body.items[0].type).toBe('transfer-credit');
    expect(bobHistory.body.items[0].balanceAfter).toBe(300);
  });

  test('a duplicate transfer (same clientRef) is not double-processed', async () => {
    const { alice, aliceAccount, bobAccount } = await setupFundedPair(1000);
    const payload = {
      fromAccount: aliceAccount._id,
      toAccountNumber: bobAccount.accountNumber,
      amount: 300,
      clientRef: 'xfer-1',
    };

    const first = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(payload);
    const second = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.transaction._id).toBe(first.body.transaction._id);

    const accounts = await request(app)
      .get('/api/accounts/mine')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(accounts.body[0].balance).toBe(700);
  });

  test('a transfer to a nonexistent account number is rejected', async () => {
    const { alice, aliceAccount } = await setupFundedPair(1000);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ fromAccount: aliceAccount._id, toAccountNumber: '0000000000', amount: 100 });
    expect(res.status).toBe(404);
  });

  test('a transfer to the same account is rejected', async () => {
    const { alice, aliceAccount } = await setupFundedPair(1000);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ fromAccount: aliceAccount._id, toAccountNumber: aliceAccount.accountNumber, amount: 100 });
    expect(res.status).toBe(400);
  });

  test('a customer cannot transfer from an account they do not own', async () => {
    const { bob, aliceAccount, bobAccount } = await setupFundedPair(1000);

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ fromAccount: aliceAccount._id, toAccountNumber: bobAccount.accountNumber, amount: 100 });
    expect(res.status).toBe(403);
  });
});

describe('Transaction history pagination and filtering', () => {
  test('pages correctly and respects the type filter', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await deposit(app, token, { account: account._id, amount: 100, clientRef: `page-${i}` });
    }

    const page1 = await request(app)
      .get('/api/transactions/mine')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.total).toBe(3);
    expect(page1.body.pages).toBe(2);

    const page2 = await request(app)
      .get('/api/transactions/mine')
      .query({ page: 2, limit: 2 })
      .set('Authorization', `Bearer ${token}`);
    expect(page2.body.items).toHaveLength(1);

    const filtered = await request(app)
      .get('/api/transactions/mine')
      .query({ type: 'deposit' })
      .set('Authorization', `Bearer ${token}`);
    expect(filtered.body.total).toBe(3);

    const noMatch = await request(app)
      .get('/api/transactions/mine')
      .query({ type: 'transfer-debit' })
      .set('Authorization', `Bearer ${token}`);
    expect(noMatch.body.total).toBe(0);
  });
});

describe('Transaction search', () => {
  test('search matches a free-text description, not just the internal reference', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    await deposit(app, token, { account: account._id, amount: 250, description: 'Birthday gift from mom' });
    await deposit(app, token, { account: account._id, amount: 400, description: 'Freelance payment' });

    const res = await request(app)
      .get('/api/transactions/mine')
      .query({ search: 'birthday' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].description).toBe('Birthday gift from mom');
  });

  test('search matches the counterparty account number on a transfer', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const aliceAccount = await openAccount(app, alice.token);
    const bobAccount = await openAccount(app, bob.token);
    await deposit(app, alice.token, { account: aliceAccount._id, amount: 1000 });
    await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ fromAccount: aliceAccount._id, toAccountNumber: bobAccount.accountNumber, amount: 300 });

    const res = await request(app)
      .get('/api/transactions/mine')
      .query({ search: bobAccount.accountNumber })
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].type).toBe('transfer-debit');
  });

  test('a customer\'s search on /mine never surfaces another customer\'s transactions', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const aliceAccount = await openAccount(app, alice.token);
    await openAccount(app, bob.token);
    await deposit(app, alice.token, { account: aliceAccount._id, amount: 100, description: 'shared-keyword' });
    await deposit(app, bob.token, { account: (await openAccount(app, bob.token))._id, amount: 100, description: 'shared-keyword' });

    const res = await request(app)
      .get('/api/transactions/mine')
      .query({ search: 'shared-keyword' })
      .set('Authorization', `Bearer ${alice.token}`);
    expect(res.body.total).toBe(1);
  });
});
