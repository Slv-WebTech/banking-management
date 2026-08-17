const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

async function transferFunds(req, res) {
  const { fromAccount, toAccountNumber, amount, description, clientRef } = req.body;
  const numericAmount = Number(amount);

  if (!fromAccount || !toAccountNumber || !numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: 'fromAccount, toAccountNumber and a positive amount are required' });
  }

  const source = await Account.findById(fromAccount);
  if (!source || source.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not own the source account' });
  }

  const destination = await Account.findOne({ accountNumber: toAccountNumber, status: 'Active' });
  if (!destination) {
    return res.status(404).json({ message: 'Recipient account not found or inactive' });
  }
  if (destination._id.toString() === source._id.toString()) {
    return res.status(400).json({ message: 'Cannot transfer to the same account' });
  }

  if (clientRef) {
    const existing = await Transaction.findOne({ clientRef, account: source._id });
    if (existing) {
      return res.status(200).json({ message: 'Transfer already processed', transaction: existing });
    }
  }

  const debitedSource = await Account.findOneAndUpdate(
    { _id: source._id, status: 'Active', balance: { $gte: numericAmount } },
    { $inc: { balance: -numericAmount } },
    { new: true }
  );
  if (!debitedSource) {
    return res.status(400).json({ message: 'Insufficient balance or inactive account' });
  }

  const creditedDestination = await Account.findOneAndUpdate(
    { _id: destination._id, status: 'Active' },
    { $inc: { balance: numericAmount } },
    { new: true }
  );
  if (!creditedDestination) {
    // Compensate: refund the source account since the credit leg failed.
    await Account.findByIdAndUpdate(source._id, { $inc: { balance: numericAmount } });
    return res.status(409).json({ message: 'Recipient account became unavailable, transfer reverted' });
  }

  const reference = new mongoose.Types.ObjectId().toString();

  const [debitTx] = await Transaction.create([
    {
      account: source._id,
      counterpartyAccount: destination._id,
      type: 'transfer-debit',
      amount: numericAmount,
      balanceAfter: debitedSource.balance,
      reference,
      clientRef,
      description: description || `Transfer to ${destination.accountNumber}`,
    },
    {
      account: destination._id,
      counterpartyAccount: source._id,
      type: 'transfer-credit',
      amount: numericAmount,
      balanceAfter: creditedDestination.balance,
      reference,
      clientRef,
      description: description || `Transfer from ${source.accountNumber}`,
    },
  ]);

  res.status(201).json({ message: 'Transfer successful', transaction: debitTx });
}

async function depositFunds(req, res) {
  const { account: accountId, amount, description, clientRef } = req.body;
  const numericAmount = Number(amount);

  if (!accountId || !numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: 'account and a positive amount are required' });
  }

  const account = await Account.findById(accountId);
  if (!account || account.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not own this account' });
  }

  if (clientRef) {
    const existing = await Transaction.findOne({ clientRef, account: account._id });
    if (existing) {
      return res.status(200).json({ message: 'Deposit already processed', transaction: existing });
    }
  }

  const creditedAccount = await Account.findOneAndUpdate(
    { _id: account._id, status: 'Active' },
    { $inc: { balance: numericAmount } },
    { new: true }
  );
  if (!creditedAccount) {
    return res.status(400).json({ message: 'Account is not active' });
  }

  const reference = new mongoose.Types.ObjectId().toString();

  const transaction = await Transaction.create({
    account: account._id,
    type: 'deposit',
    amount: numericAmount,
    balanceAfter: creditedAccount.balance,
    reference,
    clientRef,
    description: description || 'Deposit',
  });

  res.status(201).json({ message: 'Deposit successful', transaction });
}

function buildHistoryFilter(accountIds, query) {
  const { type, status, search, from, to } = query;
  const filter = { account: { $in: accountIds } };

  if (type) filter.type = type;
  if (status) filter.status = status;
  if (search) filter.reference = { $regex: search, $options: 'i' };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  return filter;
}

async function getMyTransactions(req, res) {
  const { accountId, page = 1, limit = 20 } = req.query;

  const ownedAccounts = await Account.find({ owner: req.user._id }).select('_id');
  const ownedIds = ownedAccounts.map((a) => a._id.toString());

  if (accountId && !ownedIds.includes(accountId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const accountIds = accountId ? [accountId] : ownedIds;

  const filter = buildHistoryFilter(accountIds, req.query);
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .populate('counterpartyAccount', 'accountNumber')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    Transaction.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / pageSize) });
}

async function listAllTransactions(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.reference = { $regex: req.query.search, $options: 'i' };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .populate('account', 'accountNumber')
      .populate('counterpartyAccount', 'accountNumber')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    Transaction.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, pages: Math.ceil(total / pageSize) });
}

module.exports = { transferFunds, depositFunds, getMyTransactions, listAllTransactions };
