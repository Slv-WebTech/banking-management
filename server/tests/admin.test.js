const request = require('supertest');
const app = require('../app');
const { registerUser, openAccount, deposit, createUserWithRole } = require('./helpers');

describe('Admin', () => {
  test('a non-admin cannot reach admin endpoints', async () => {
    const { token } = await registerUser(app);
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("a role promotion takes effect immediately, even on the user's pre-promotion token", async () => {
    const customer = await registerUser(app);
    const admin = await createUserWithRole(app, 'admin');

    const promote = await request(app)
      .patch(`/api/admin/users/${customer.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'employee' });
    expect(promote.status).toBe(200);

    // customer.token was issued before the promotion, but protect() re-checks
    // the live role from the DB on every request rather than trusting the JWT.
    const res = await request(app).get('/api/accounts/all').set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(200);
  });

  test("suspending a user rejects their pre-suspension token on the very next request", async () => {
    const customer = await registerUser(app);
    const admin = await createUserWithRole(app, 'admin');

    const suspend = await request(app)
      .patch(`/api/admin/users/${customer.user.id}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'suspended' });
    expect(suspend.status).toBe(200);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(401);
  });

  test('the system report reflects real seeded data accurately', async () => {
    const admin = await createUserWithRole(app, 'admin');
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const aliceAccount = await openAccount(app, alice.token);
    await openAccount(app, bob.token);
    await deposit(app, alice.token, { account: aliceAccount._id, amount: 750 });

    const res = await request(app).get('/api/admin/report').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.userCount).toBe(3);
    expect(res.body.activeAccountCount).toBe(2);
    expect(res.body.totalBalance).toBe(750);
    expect(res.body.transactionCount).toBe(1);
  });

  test('search and role filters narrow the user list correctly', async () => {
    const admin = await createUserWithRole(app, 'admin');
    await registerUser(app, { name: 'Findable Person', email: 'findme@example.com' });
    await registerUser(app, { name: 'Someone Else', email: 'someone@example.com' });

    const bySearch = await request(app)
      .get('/api/admin/users')
      .query({ search: 'findme' })
      .set('Authorization', `Bearer ${admin.token}`);
    expect(bySearch.body).toHaveLength(1);
    expect(bySearch.body[0].email).toBe('findme@example.com');

    const byRole = await request(app)
      .get('/api/admin/users')
      .query({ role: 'admin' })
      .set('Authorization', `Bearer ${admin.token}`);
    expect(byRole.body).toHaveLength(1);
    expect(byRole.body[0].role).toBe('admin');
  });
});
