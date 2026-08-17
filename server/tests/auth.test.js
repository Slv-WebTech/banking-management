const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { registerUser } = require('./helpers');

describe('Auth', () => {
  test('register creates a user and returns a token', async () => {
    const { response } = await registerUser(app, { email: 'alice@example.com' });
    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe('alice@example.com');
    expect(response.body.user.role).toBe('customer');
  });

  test('register rejects a duplicate email', async () => {
    await registerUser(app, { email: 'dupe@example.com' });
    const { response } = await registerUser(app, { email: 'dupe@example.com' });
    expect(response.status).toBe(409);
  });

  test('register rejects a short password', async () => {
    const { response } = await registerUser(app, { email: 'short@example.com', password: '123' });
    expect(response.status).toBe(400);
  });

  test('login succeeds with correct credentials', async () => {
    await registerUser(app, { email: 'bob@example.com', password: 'Password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'Password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('login rejects the wrong password', async () => {
    await registerUser(app, { email: 'carol@example.com', password: 'Password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  test('login rejects an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123' });
    expect(res.status).toBe(401);
  });

  test('/me requires a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('/me returns the caller with a valid token', async () => {
    const { token } = await registerUser(app, { email: 'dave@example.com', name: 'Dave' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Dave');
  });

  test('a suspended user is rejected on their very next request, even with a still-valid token', async () => {
    const { token, user } = await registerUser(app, { email: 'eve@example.com' });
    await User.findByIdAndUpdate(user.id, { status: 'suspended' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
