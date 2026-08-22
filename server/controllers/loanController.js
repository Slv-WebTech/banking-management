const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');
const { buildAmortizationSchedule } = require('../utils/loanSchedule');

async function applyForLoan(req, res) {
  const { disbursalAccount, principal, termMonths, purpose } = req.body;
  const numericPrincipal = Number(principal);
  const numericTerm = Number(termMonths);

  const account = await Account.findById(disbursalAccount);
  if (!account || account.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not own the disbursal account' });
  }
  if (account.status !== 'Active') {
    return res.status(400).json({ message: 'Disbursal account is not active' });
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

  const disbursed = await Account.findOneAndUpdate(
    { _id: loan.disbursalAccount, status: 'Active' },
    { $inc: { balance: loan.principal } },
    { new: true }
  );
  if (!disbursed) {
    return res.status(400).json({ message: 'Disbursal account is not active' });
  }

  const { emi, schedule } = buildAmortizationSchedule(loan.principal, numericRate, loan.termMonths);

  const reference = new mongoose.Types.ObjectId().toString();
  await Transaction.create({
    account: disbursed._id,
    type: 'loan-disbursement',
    amount: loan.principal,
    balanceAfter: disbursed.balance,
    reference,
    description: `Loan disbursement (${loan._id})`,
  });

  loan.status = 'Approved';
  loan.annualInterestRate = numericRate;
  loan.emiAmount = emi;
  loan.schedule = schedule;
  loan.reviewedBy = req.user._id;
  loan.reviewedAt = new Date();
  await loan.save();

  res.json(loan);
}

async function rejectLoan(req, res) {
  const { reviewNote } = req.body;

  const loan = await Loan.findById(req.params.id);
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  if (loan.status !== 'Pending') {
    return res.status(400).json({ message: 'Only pending loans can be rejected' });
  }

  loan.status = 'Rejected';
  loan.reviewedBy = req.user._id;
  loan.reviewedAt = new Date();
  loan.reviewNote = reviewNote || undefined;
  await loan.save();

  res.json(loan);
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

  const debited = await Account.findOneAndUpdate(
    { _id: account._id, status: 'Active', balance: { $gte: dueInstallment.amount } },
    { $inc: { balance: -dueInstallment.amount } },
    { new: true }
  );
  if (!debited) {
    return res.status(400).json({ message: 'Insufficient balance or inactive account' });
  }

  const reference = new mongoose.Types.ObjectId().toString();
  const transaction = await Transaction.create({
    account: debited._id,
    type: 'loan-repayment',
    amount: dueInstallment.amount,
    balanceAfter: debited.balance,
    reference,
    clientRef,
    description: `Loan EMI #${dueInstallment.installmentNumber} (${loan._id})`,
  });

  dueInstallment.status = 'Paid';
  dueInstallment.paidAt = new Date();
  const stillDue = loan.schedule.some((installment) => installment.status === 'Due');
  if (!stillDue) loan.status = 'Closed';
  await loan.save();

  res.status(201).json({ message: 'Installment paid', transaction, loan });
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
