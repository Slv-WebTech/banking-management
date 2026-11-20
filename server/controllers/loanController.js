const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');
const { buildAmortizationSchedule } = require('../utils/loanSchedule');
const { adjustBalance, parseAmount } = require('../utils/money');

const MAX_PENDING_LOANS = Number(process.env.MAX_PENDING_LOANS) || 3;

async function applyForLoan(req, res) {
  const { disbursalAccount, principal, termMonths, purpose } = req.body;
  const numericPrincipal = parseAmount(principal);
  if (!numericPrincipal) {
    return res.status(400).json({ message: 'principal must be a positive amount with at most 2 decimals' });
  }
  const numericTerm = Number(termMonths);

  const account = await Account.findById(disbursalAccount);
  if (!account || account.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not own the disbursal account' });
  }
  if (account.status !== 'Active') {
    return res.status(400).json({ message: 'Disbursal account is not active' });
  }
  const pendingCount = await Loan.countDocuments({ borrower: req.user._id, status: 'Pending' });
  if (pendingCount >= MAX_PENDING_LOANS) {
    return res.status(400).json({
      message: `You already have ${pendingCount} loan applications awaiting review (maximum ${MAX_PENDING_LOANS})`,
    });
  }

  const loan = await Loan.create({
    borrower: req.user._id,
    disbursalAccount: account._id,
    principal: numericPrincipal,
    termMonths: numericTerm,
    purpose: purpose || undefined,
    status: 'Pending',
  });

  res.status(201).json(loan);
}

async function getMyLoans(req, res) {
  const loans = await Loan.find({ borrower: req.user._id })
    .populate('disbursalAccount', 'accountNumber')
    .sort({ createdAt: -1 });
  res.json(loans);
}

async function listAllLoans(req, res) {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const loans = await Loan.find(filter)
    .populate('borrower', 'name email')
    .populate('disbursalAccount', 'accountNumber')
    .sort({ createdAt: -1 });
  res.json(loans);
}

async function getLoanById(req, res) {
  const loan = await Loan.findById(req.params.id)
    .populate('borrower', 'name email')
    .populate('disbursalAccount', 'accountNumber');
  if (!loan) return res.status(404).json({ message: 'Loan not found' });

  const isOwner = loan.borrower._id.toString() === req.user._id.toString();
  const isStaff = ['employee', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(loan);
}

async function approveLoan(req, res) {
  const { annualInterestRate } = req.body;
  const numericRate = Number(annualInterestRate);

  const loan = await Loan.findById(req.params.id);
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  if (loan.status !== 'Pending') {
    return res.status(400).json({ message: 'Only pending loans can be approved' });
  }
  if (loan.borrower.toString() === req.user._id.toString()) {
    return res.status(403).json({ message: 'You cannot review your own loan' });
  }

  const { emi, schedule } = buildAmortizationSchedule(loan.principal, numericRate, loan.termMonths);

  // Atomically claim the loan (Pending -> Approved) so two concurrent
  // approvals can never both disburse.
  const claimed = await Loan.findOneAndUpdate(
    { _id: loan._id, status: 'Pending' },
    {
      status: 'Approved',
      annualInterestRate: numericRate,
      emiAmount: emi,
      schedule,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    },
    { new: true }
  );
  if (!claimed) {
    return res.status(409).json({ message: 'Loan was already reviewed' });
  }

  const revertClaim = () =>
    Loan.updateOne(
      { _id: loan._id },
      {
        status: 'Pending',
        $unset: { annualInterestRate: 1, emiAmount: 1, reviewedBy: 1, reviewedAt: 1 },
        schedule: [],
      }
    );

  const disbursed = await Account.findOneAndUpdate(
    { _id: loan.disbursalAccount, status: 'Active' },
    adjustBalance(loan.principal),
    { new: true }
  );
  if (!disbursed) {
    await revertClaim();
    return res.status(400).json({ message: 'Disbursal account is not active' });
  }

  try {
    await Transaction.create({
      account: disbursed._id,
      type: 'loan-disbursement',
      amount: loan.principal,
      balanceAfter: disbursed.balance,
      reference: new mongoose.Types.ObjectId().toString(),
      description: `Loan disbursement (${loan._id})`,
    });
  } catch (err) {
    await Account.findByIdAndUpdate(disbursed._id, adjustBalance(-loan.principal));
    await revertClaim();
    throw err;
  }

  res.json(claimed);
}

async function rejectLoan(req, res) {
  const { reviewNote } = req.body;

  const loan = await Loan.findById(req.params.id);
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  if (loan.status !== 'Pending') {
    return res.status(400).json({ message: 'Only pending loans can be rejected' });
  }
  if (loan.borrower.toString() === req.user._id.toString()) {
    return res.status(403).json({ message: 'You cannot review your own loan' });
  }

  const rejected = await Loan.findOneAndUpdate(
    { _id: loan._id, status: 'Pending' },
    { status: 'Rejected', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: reviewNote || undefined },
    { new: true }
  );
  if (!rejected) return res.status(409).json({ message: 'Loan was already reviewed' });

  res.json(rejected);
}

async function payInstallment(req, res) {
  const { account: accountId, clientRef } = req.body;

  const loan = await Loan.findById(req.params.id);
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  if (loan.borrower.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You are not the borrower on this loan' });
  }
  if (loan.status !== 'Approved') {
    return res.status(400).json({ message: 'This loan has no due installments' });
  }

  const dueInstallment = loan.schedule.find((installment) => installment.status === 'Due');
  if (!dueInstallment) {
    return res.status(400).json({ message: 'This loan has no due installments' });
  }

  const account = await Account.findById(accountId);
  if (!account || account.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not own this account' });
  }

  if (clientRef) {
    const existing = await Transaction.findOne({ clientRef, account: account._id });
    if (existing) {
      return res.status(200).json({ message: 'Payment already processed', transaction: existing, loan });
    }
  }

  // Atomically mark the installment Paid first, so a concurrent request for the
  // same installment cannot also debit the account.
  const number = dueInstallment.installmentNumber;
  const claimed = await Loan.findOneAndUpdate(
    { _id: loan._id, status: 'Approved', schedule: { $elemMatch: { installmentNumber: number, status: 'Due' } } },
    { $set: { 'schedule.$.status': 'Paid', 'schedule.$.paidAt': new Date() } },
    { new: true }
  );
  if (!claimed) {
    return res.status(409).json({ message: 'Installment was already paid' });
  }

  const unclaim = () =>
    Loan.updateOne(
      { _id: loan._id, 'schedule.installmentNumber': number },
      { $set: { 'schedule.$.status': 'Due' }, $unset: { 'schedule.$.paidAt': 1 } }
    );

  const debited = await Account.findOneAndUpdate(
    { _id: account._id, status: 'Active', balance: { $gte: dueInstallment.amount } },
    adjustBalance(-dueInstallment.amount),
    { new: true }
  );
  if (!debited) {
    await unclaim();
    return res
      .status(400)
      .json({ message: account.status !== 'Active' ? 'Payment account is not active' : 'Insufficient balance' });
  }

  let transaction;
  try {
    transaction = await Transaction.create({
      account: debited._id,
      type: 'loan-repayment',
      amount: dueInstallment.amount,
      balanceAfter: debited.balance,
      reference: new mongoose.Types.ObjectId().toString(),
      clientRef,
      description: `Loan EMI #${number} (${loan._id})`,
    });
  } catch (err) {
    await Account.findByIdAndUpdate(debited._id, adjustBalance(dueInstallment.amount));
    await unclaim();
    if (err.code === 11000 && clientRef) {
      const existing = await Transaction.findOne({ clientRef, account: account._id });
      if (existing) return res.status(200).json({ message: 'Payment already processed', transaction: existing, loan });
    }
    throw err;
  }

  if (!claimed.schedule.some((installment) => installment.status === 'Due')) {
    claimed.status = 'Closed';
    await claimed.save();
  }

  res.status(201).json({ message: 'Installment paid', transaction, loan: claimed });
}

module.exports = {
  applyForLoan,
  getMyLoans,
  listAllLoans,
  getLoanById,
  approveLoan,
  rejectLoan,
  payInstallment,
};
