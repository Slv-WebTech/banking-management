const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const escapeRegex = require('../utils/escapeRegex');
const { adjustBalance, parseAmount, MAX_DEPOSIT_AMOUNT } = require('../utils/money');

async function transferFunds(req, res) {
  const { fromAccount, toAccountNumber, amount, description, clientRef } = req.body;
  const numericAmount = parseAmount(amount);

  if (!fromAccount || !toAccountNumber || !numericAmount) {
    return res.status(400).json({
      message: 'fromAccount, toAccountNumber and a valid positive amount (max 2 decimals) are required',
    });
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
    adjustBalance(-numericAmount),
    { new: true }
  );
  if (!debitedSource) {
    return res
      .status(400)
      .json({ message: source.status !== 'Active' ? 'Source account is not active' : 'Insufficient balance' });
  }

  const creditedDestination = await Account.findOneAndUpdate(
    { _id: destination._id, status: 'Active' },
    adjustBalance(numericAmount),
    { new: true }
  );
  if (!creditedDestination) {
    // Compensate: refund the source account since the credit leg failed.
    await Account.findByIdAndUpdate(source._id, adjustBalance(numericAmount));
    return res.status(409).json({ message: 'Recipient account became unavailable, transfer reverted' });
  }

  const reference = new mongoose.Types.ObjectId().toString();

  let debitTx;
  try {
    [debitTx] = await Transaction.create(
      [
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
      description: description || `Transfer from ${source.accountNumber}`,
    },
      ],
      { ordered: true }
    );
  } catch (err) {
    // The ledger write failed after balances moved: put the money back so
    // balances never drift from the ledger.
    await Account.findByIdAndUpdate(source._id, adjustBalance(numericAmount));
    await Account.findByIdAndUpdate(destination._id, adjustBalance(-numericAmount));
    if (err.code === 11000 && clientRef) {
      const existing = await Transaction.findOne({ clientRef, account: source._id });
      if (existing) return res.status(200).json({ message: 'Transfer already processed', transaction: existing });
    }
    throw err;
  }

  res.status(201).json({ message: 'Transfer successful', transaction: debitTx });
}

async function depositFunds(req, res) {
  const { account: accountId, amount, description, clientRef } = req.body;
  const numericAmount = parseAmount(amount, MAX_DEPOSIT_AMOUNT);

  if (!accountId || !numericAmount) {
    return res.status(400).json({
      message: `account and a valid positive amount (max 2 decimals, at most ${MAX_DEPOSIT_AMOUNT}) are required`,
    });
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
    adjustBalance(numericAmount),
    { new: true }
  );
  if (!creditedAccount) {
    return res.status(400).json({ message: 'Account is not active' });
  }

  const reference = new mongoose.Types.ObjectId().toString();

  let transaction;
  try {
    transaction = await Transaction.create({
      account: account._id,
      type: 'deposit',
      amount: numericAmount,
      balanceAfter: creditedAccount.balance,
      reference,
      clientRef,
      description: description || 'Deposit',
    });
  } catch (err) {
    await Account.findByIdAndUpdate(account._id, adjustBalance(-numericAmount));
    if (err.code === 11000 && clientRef) {
      const existing = await Transaction.findOne({ clientRef, account: account._id });
      if (existing) return res.status(200).json({ message: 'Deposit already processed', transaction: existing });
    }
    throw err;
  }

  res.status(201).json({ message: 'Deposit successful', transaction });
}

// accountIds narrows the search to a specific set of accounts (the caller's
// own, for /mine); omit it for the staff-wide /all view.
async function buildHistoryFilter(query, accountIds) {
  const { type, status, search, from, to } = query;
  const filter = {};

  if (accountIds) filter.account = { $in: accountIds };
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (search) {
    const matchingAccounts = await Account.find({ accountNumber: { $regex: escapeRegex(search), $options: 'i' } }).select('_id');
    const matchingAccountIds = matchingAccounts.map((a) => a._id);
    filter.$or = [
      { reference: { $regex: escapeRegex(search), $options: 'i' } },
      { description: { $regex: escapeRegex(search), $options: 'i' } },
      ...(matchingAccountIds.length
        ? [{ account: { $in: matchingAccountIds } }, { counterpartyAccount: { $in: matchingAccountIds } }]
        : []),
    ];
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

  const filter = await buildHistoryFilter(req.query, accountIds);
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
  const filter = await buildHistoryFilter(req.query);

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
