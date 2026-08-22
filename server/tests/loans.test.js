const request = require('supertest');
const app = require('../app');
const { registerUser, openAccount, createUserWithRole, applyForLoan, approveLoan } = require('./helpers');

describe('Loan application', () => {
  test('a customer can apply for a loan against an account they own, starting Pending', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);

    const res = await applyForLoan(app, token, { disbursalAccount: account._id, principal: 50000, termMonths: 12 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pending');
    expect(res.body.principal).toBe(50000);
    expect(res.body.schedule).toHaveLength(0);
  });

  test('a customer cannot apply for a loan against an account they do not own', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const bobAccount = await openAccount(app, bob.token);

    const res = await applyForLoan(app, alice.token, {
      disbursalAccount: bobAccount._id,
      principal: 10000,
      termMonths: 6,
    });
    expect(res.status).toBe(403);
  });

  test('a non-positive principal or out-of-range term is rejected', async () => {
    const { token } = await registerUser(app);
    const account = await openAccount(app, token);

    const badPrincipal = await applyForLoan(app, token, { disbursalAccount: account._id, principal: 0, termMonths: 12 });
    expect(badPrincipal.status).toBe(400);

    const badTerm = await applyForLoan(app, token, { disbursalAccount: account._id, principal: 10000, termMonths: 0 });
    expect(badTerm.status).toBe(400);
  });
});

describe('Loan review (approve/reject)', () => {
  async function setupPendingLoan(principal = 100000, termMonths = 12) {
    const customer = await registerUser(app);
    const account = await openAccount(app, customer.token);
    const employee = await createUserWithRole(app, 'employee');
    const applyRes = await applyForLoan(app, customer.token, { disbursalAccount: account._id, principal, termMonths });
    return { customer, account, employee, loan: applyRes.body };
  }

  test('a customer cannot approve their own loan', async () => {
    const { customer, loan } = await setupPendingLoan();
    const res = await approveLoan(app, customer.token, loan._id);
    expect(res.status).toBe(403);
  });

  test('an employee approving a loan disburses the principal and builds a schedule', async () => {
    const { customer, account, employee, loan } = await setupPendingLoan(120000, 12);

    const res = await approveLoan(app, employee.token, loan._id, 12);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
    expect(res.body.schedule).toHaveLength(12);
    expect(res.body.emiAmount).toBeGreaterThan(0);

    const accounts = await request(app)
      .get('/api/accounts/mine')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(accounts.body.find((a) => a._id === account._id).balance).toBe(120000);

    const history = await request(app)
      .get('/api/transactions/mine')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(history.body.items[0].type).toBe('loan-disbursement');
    expect(history.body.items[0].amount).toBe(120000);
  });

  test('a loan cannot be approved twice', async () => {
    const { employee, loan } = await setupPendingLoan();
    await approveLoan(app, employee.token, loan._id);
    const second = await approveLoan(app, employee.token, loan._id);
    expect(second.status).toBe(400);
  });

  test('an employee can reject a pending loan with a note, and no money moves', async () => {
    const { customer, account, employee, loan } = await setupPendingLoan();

    const res = await request(app)
      .patch(`/api/loans/${loan._id}/reject`)
      .set('Authorization', `Bearer ${employee.token}`)
      .send({ reviewNote: 'Insufficient income documentation' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Rejected');
    expect(res.body.reviewNote).toBe('Insufficient income documentation');

    const accounts = await request(app)
      .get('/api/accounts/mine')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(accounts.body.find((a) => a._id === account._id).balance).toBe(0);
  });

  test('an employee can list all loans and filter by status', async () => {
    const { employee } = await setupPendingLoan();
    await setupPendingLoan();

    const res = await request(app).get('/api/loans/all').set('Authorization', `Bearer ${employee.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    const pendingOnly = await request(app)
      .get('/api/loans/all')
      .query({ status: 'Pending' })
      .set('Authorization', `Bearer ${employee.token}`);
    expect(pendingOnly.body.every((l) => l.status === 'Pending')).toBe(true);
  });
});

describe('Loan repayment', () => {
  async function setupApprovedLoan(principal = 24000, termMonths = 2, rate = 12) {
    const customer = await registerUser(app);
    const account = await openAccount(app, customer.token);
    const employee = await createUserWithRole(app, 'employee');
    const applyRes = await applyForLoan(app, customer.token, { disbursalAccount: account._id, principal, termMonths });
    const approveRes = await approveLoan(app, employee.token, applyRes.body._id, rate);
    return { customer, account, employee, loan: approveRes.body };
  }

  test('paying the first EMI debits the account and marks the first installment paid', async () => {
    const { customer, account, loan } = await setupApprovedLoan();
    const firstEmi = loan.schedule[0].amount;

    const res = await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: account._id, clientRef: 'emi-1' });

    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe('loan-repayment');
    expect(res.body.transaction.amount).toBe(firstEmi);
    expect(res.body.loan.schedule[0].status).toBe('Paid');
    expect(res.body.loan.schedule[1].status).toBe('Due');
    expect(res.body.loan.status).toBe('Approved');

    const accounts = await request(app)
      .get('/api/accounts/mine')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(accounts.body.find((a) => a._id === account._id).balance).toBe(
      loan.principal - firstEmi
    );
  });

  test('paying the final installment closes the loan', async () => {
    // 0% interest so the two EMIs sum to exactly the disbursed principal —
    // isolates the "closes when fully repaid" behavior from needing extra
    // funding to cover interest (interest cost is exercised separately above).
    const { customer, account, loan } = await setupApprovedLoan(24000, 2, 0);

    await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: account._id, clientRef: 'emi-1' });
    const second = await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: account._id, clientRef: 'emi-2' });

    expect(second.status).toBe(201);
    expect(second.body.loan.status).toBe('Closed');

    const noneDue = await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: account._id, clientRef: 'emi-3' });
    expect(noneDue.status).toBe(400);
  });

  test('a duplicate EMI payment (same clientRef) is not double-processed', async () => {
    const { customer, account, loan } = await setupApprovedLoan();

    const first = await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: account._id, clientRef: 'dup-emi' });
    const second = await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: account._id, clientRef: 'dup-emi' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.transaction._id).toBe(first.body.transaction._id);

    const accounts = await request(app)
      .get('/api/accounts/mine')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(accounts.body.find((a) => a._id === account._id).balance).toBe(
      loan.principal - loan.schedule[0].amount
    );
  });

  test('an EMI payment with insufficient balance is rejected and the loan stays unpaid', async () => {
    const { customer, loan } = await setupApprovedLoan();
    const emptyAccount = await openAccount(app, customer.token);

    const res = await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: emptyAccount._id });
    expect(res.status).toBe(400);
  });

  test('another customer cannot pay someone else\'s loan', async () => {
    const { loan } = await setupApprovedLoan();
    const stranger = await registerUser(app);
    const strangerAccount = await openAccount(app, stranger.token);

    const res = await request(app)
      .post(`/api/loans/${loan._id}/pay`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ account: strangerAccount._id });
    expect(res.status).toBe(403);
  });

  test('a pending (unapproved) loan has no due installments to pay', async () => {
    const customer = await registerUser(app);
    const account = await openAccount(app, customer.token);
    const applyRes = await applyForLoan(app, customer.token, {
      disbursalAccount: account._id,
      principal: 10000,
      termMonths: 6,
    });

    const res = await request(app)
      .post(`/api/loans/${applyRes.body._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ account: account._id });
    expect(res.status).toBe(400);
  });
});
