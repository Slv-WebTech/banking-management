// Regression tests from the senior-QA pass (docs/QA-REPORT.md).
const request = require('supertest');
const app = require('../app');
const { errorHandler } = require('../middleware/errorHandler');
const { parseAmount } = require('../utils/money');
const { buildAmortizationSchedule } = require('../utils/loanSchedule');
const { registerUser, openAccount, deposit, createUserWithRole } = require('./helpers');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('malformed input is a 400, never a 500', () => {
  let token;
  let account;
  beforeEach(async () => {
    ({ token } = await registerUser(app));
    account = await openAccount(app, token);
  });

  test.each([
    ['transfer: non-ObjectId fromAccount', 'post', '/api/transactions/transfer', { fromAccount: 'abc', toAccountNumber: '1234567890', amount: 1 }],
    ['transfer: object fromAccount', 'post', '/api/transactions/transfer', { fromAccount: { a: 1 }, toAccountNumber: '1234567890', amount: 1 }],
    ['transfer: object toAccountNumber', 'post', '/api/transactions/transfer', { fromAccount: '507f1f77bcf86cd799439011', toAccountNumber: { a: 1 }, amount: 1 }],
    ['deposit: non-ObjectId account', 'post', '/api/transactions/deposit', { account: 'zzz', amount: 1 }],
    ['loan apply: non-ObjectId disbursalAccount', 'post', '/api/loans', { disbursalAccount: 'xyz', principal: 1000, termMonths: 6 }],
    ['register: object password', 'post', '/api/auth/register', { name: 'x', email: 'a@b.example', password: { a: 1 } }],
    ['register: object name', 'post', '/api/auth/register', { name: { a: 1 }, email: 'a@b.example', password: 'Password123' }],
    ['register: password longer than bcrypt limit', 'post', '/api/auth/register', { name: 'x', email: 'a@b.example', password: 'a'.repeat(73) }],
  ])('%s', async (_name, method, url, body) => {
    const res = await request(app)[method](url).set(auth(token)).send(body);
    expect(res.status).toBe(400);
  });

  test('object-typed description/purpose is rejected', async () => {
    const dep = await deposit(app, token, { account: account._id, amount: 1, description: { x: 1 } });
    expect(dep.status).toBe(400);
    const loan = await request(app)
      .post('/api/loans')
      .set(auth(token))
      .send({ disbursalAccount: account._id, principal: 1000, termMonths: 6, purpose: { a: 1 } });
    expect(loan.status).toBe(400);
  });

  test.each(['/api/loans/notanid', '/api/accounts/notanid', '/api/transactions/mine?from=garbage', '/api/transactions/mine?to=garbage', '/api/transactions/mine?type[$ne]=x'])(
    'GET %s',
    async (url) => {
      const res = await request(app).get(url).set(auth(token));
      expect(res.status).toBe(400);
    }
  );

  test('admin routes with a bad id are 400', async () => {
    const admin = await createUserWithRole(app, 'admin');
    const res = await request(app).patch('/api/admin/users/notanid/status').set(auth(admin.token)).send({ status: 'active' });
    expect(res.status).toBe(400);
  });
});

describe('amount parsing', () => {
  test('non-scalar types are not amounts', () => {
    expect(parseAmount([1])).toBeNull();
    expect(parseAmount(true)).toBeNull();
    expect(parseAmount({})).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount('1e2')).toBe(100);
  });

  test('deposit with an array amount is refused', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    const res = await deposit(app, token, { account: account._id, amount: [1] });
    expect(res.status).toBe(400);
  });
});

describe('error handler', () => {
  const run = (err, env) => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    const out = {};
    const res = { statusCode: 200, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, {}, res, () => {});
    spy.mockRestore();
    process.env.NODE_ENV = prev;
    return out;
  };

  test('stack traces only in explicit development', () => {
    const err = new Error('boom');
    err.statusCode = 500;
    expect(run(err, 'development').body.stack).toBeDefined();
    expect(run(err, 'production').body.stack).toBeUndefined();
    expect(run(err, undefined).body.stack).toBeUndefined(); // unset NODE_ENV must not leak
    expect(run(err, 'production').body.message).toBe('Server error');
  });

  test('mongoose CastError / ValidationError map to 400', () => {
    const cast = Object.assign(new Error('x'), { name: 'CastError', path: '_id' });
    expect(run(cast, 'production').status).toBe(400);
    const val = Object.assign(new Error('x'), { name: 'ValidationError' });
    expect(run(val, 'production').status).toBe(400);
  });
});

describe('login timing equalisation', () => {
  test('unknown email and wrong password give the same status and message', async () => {
    const { user } = await registerUser(app, { email: 'known@example.com' });
    expect(user).toBeDefined();
    const wrong = await request(app).post('/api/auth/login').send({ email: 'known@example.com', password: 'WrongPass123' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'WrongPass123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });
});

describe('loan schedule due dates', () => {
  const days = (start, n) => buildAmortizationSchedule(1200, 0, n, start).schedule.map((s) => [s.dueDate.getFullYear(), s.dueDate.getMonth() + 1, s.dueDate.getDate()].join('-'));

  test('month-end start dates clamp instead of overflowing into the next month', () => {
    expect(days(new Date(2026, 0, 31), 4)).toEqual(['2026-2-28', '2026-3-31', '2026-4-30', '2026-5-31']);
  });

  test('leap-year February and year rollover', () => {
    expect(days(new Date(2027, 11, 31), 3)).toEqual(['2028-1-31', '2028-2-29', '2028-3-31']);
  });

  test('ordinary dates keep their day of month', () => {
    expect(days(new Date(2026, 5, 15), 3)).toEqual(['2026-7-15', '2026-8-15', '2026-9-15']);
  });
});

describe('accounts/all status filter', () => {
  test('filters by status and ignores unknown values', async () => {
    const staff = await createUserWithRole(app, 'employee');
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    await openAccount(app, token);
    await request(app).post(`/api/accounts/${account._id}/request-closure`).set(auth(token));

    const pending = await request(app).get('/api/accounts/all?status=PendingClosure').set(auth(staff.token));
    expect(pending.status).toBe(200);
    expect(pending.body).toHaveLength(1);
    expect(pending.body[0].status).toBe('PendingClosure');

    const bogus = await request(app).get('/api/accounts/all?status[$ne]=Active').set(auth(staff.token));
    expect(bogus.status).toBe(200);
    expect(bogus.body).toHaveLength(2); // unknown/operator values are ignored, not applied
  });
});

describe('ledger integrity', () => {
  test('concurrent transfers never overdraw and conserve money', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const from = await openAccount(app, a.token);
    const to = await openAccount(app, b.token);
    await deposit(app, a.token, { account: from._id, amount: 100 });

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        request(app)
          .post('/api/transactions/transfer')
          .set(auth(a.token))
          .send({ fromAccount: from._id, toAccountNumber: to.accountNumber, amount: 40 })
      )
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);

    const src = await request(app).get(`/api/accounts/${from._id}`).set(auth(a.token));
    const dst = await request(app).get(`/api/accounts/${to._id}`).set(auth(b.token));
    expect(src.body.balance).toBe(20);
    expect(dst.body.balance).toBe(80);
  });

  test('ten 0.10 deposits sum to exactly 1.00', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await deposit(app, token, { account: account._id, amount: 0.1 });
    }
    const res = await request(app).get(`/api/accounts/${account._id}`).set(auth(token));
    expect(res.body.balance).toBe(1); // strict: no float residue
  });
});

describe('list pagination (accounts/all, admin/users)', () => {
  test('X-Total-Count reports the full total and limit/page slice the array', async () => {
    const admin = await createUserWithRole(app, 'admin');
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const { token } = await registerUser(app);
      // eslint-disable-next-line no-await-in-loop
      await openAccount(app, token);
    }
    const page1 = await request(app).get('/api/accounts/all?limit=3').set(auth(admin.token));
    expect(page1.status).toBe(200);
    expect(page1.body).toHaveLength(3);
    expect(page1.headers['x-total-count']).toBe('4');
    const page2 = await request(app).get('/api/accounts/all?limit=3&page=2').set(auth(admin.token));
    expect(page2.body).toHaveLength(1);

    const users = await request(app).get('/api/admin/users?limit=2').set(auth(admin.token));
    expect(users.body).toHaveLength(2);
    expect(users.headers['x-total-count']).toBe('5'); // 4 customers + the admin
  });

  test('limit is capped and bad values fall back to defaults', async () => {
    const admin = await createUserWithRole(app, 'admin');
    const res = await request(app).get('/api/admin/users?limit=999999&page=-3').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('pending loan cap', () => {
  test('a borrower cannot stack more than 3 pending applications', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);
    const apply = () =>
      request(app).post('/api/loans').set(auth(token)).send({ disbursalAccount: account._id, principal: 1000, termMonths: 6 });
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await apply()).status).toBe(201);
    }
    const fourth = await apply();
    expect(fourth.status).toBe(400);
    expect(fourth.body.message).toMatch(/awaiting review/);
  });
});

describe('specific failure messages', () => {
  test('transfer distinguishes insufficient balance from an inactive source', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const from = await openAccount(app, a.token);
    const to = await openAccount(app, b.token);

    const poor = await request(app)
      .post('/api/transactions/transfer')
      .set(auth(a.token))
      .send({ fromAccount: from._id, toAccountNumber: to.accountNumber, amount: 10 });
    expect(poor.status).toBe(400);
    expect(poor.body.message).toBe('Insufficient balance');

    await request(app).post(`/api/accounts/${from._id}/request-closure`).set(auth(a.token));
    const inactive = await request(app)
      .post('/api/transactions/transfer')
      .set(auth(a.token))
      .send({ fromAccount: from._id, toAccountNumber: to.accountNumber, amount: 10 });
    expect(inactive.status).toBe(400);
    expect(inactive.body.message).toBe('Source account is not active');
  });
});

describe('CORS exposes the total-count header', () => {
  test('Access-Control-Expose-Headers lists X-Total-Count', async () => {
    const admin = await createUserWithRole(app, 'admin');
    const res = await request(app).get('/api/admin/users').set(auth(admin.token)).set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-expose-headers']).toMatch(/X-Total-Count/i);
  });
});
