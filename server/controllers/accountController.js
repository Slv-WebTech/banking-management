const Account = require('../models/Account');
const escapeRegex = require('../utils/escapeRegex');
const generateAccountNumber = require('../utils/generateAccountNumber');
const { parsePaging } = require('../utils/pagination');

async function createUniqueAccountNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateAccountNumber();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Account.exists({ accountNumber: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Could not generate a unique account number, please try again');
}

async function createAccount(req, res) {
  const { accountType } = req.body;
  const accountNumber = await createUniqueAccountNumber();

  const account = await Account.create({
    owner: req.user._id,
    accountNumber,
    accountType: accountType === 'Current' ? 'Current' : 'Savings',
    balance: 0,
  });

  res.status(201).json(account);
}

async function getMyAccounts(req, res) {
  const accounts = await Account.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json(accounts);
}

async function getAccountById(req, res) {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });

  const isOwner = account.owner.toString() === req.user._id.toString();
  const isStaff = ['employee', 'admin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json(account);
}

async function listAllAccounts(req, res) {
  const { search, status } = req.query;
  const filter = {};
  if (typeof status === 'string' && ['Active', 'PendingClosure', 'Closed'].includes(status)) filter.status = status;
  if (search) {
    filter.accountNumber = { $regex: escapeRegex(search), $options: 'i' };
  }
  const { skip, limit } = parsePaging(req.query);
  const [accounts, total] = await Promise.all([
    Account.find(filter).populate('owner', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Account.countDocuments(filter),
  ]);
  res.set('X-Total-Count', String(total));
  res.json(accounts);
}

async function requestClosure(req, res) {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });
  if (account.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (account.status !== 'Active') {
    return res.status(400).json({ message: 'Only active accounts can be closed' });
  }
  if (account.balance > 0) {
    return res.status(400).json({ message: 'Account balance must be zero before closure' });
  }
  // Atomic: re-check status and zero balance at write time.
  const updated = await Account.findOneAndUpdate(
    { _id: account._id, status: 'Active', balance: 0 },
    { status: 'PendingClosure' },
    { new: true }
  );
  if (!updated) return res.status(409).json({ message: 'Account changed, please retry' });
  res.json(updated);
}

async function approveClosure(req, res) {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });
  if (account.status !== 'PendingClosure') {
    return res.status(400).json({ message: 'Account is not pending closure' });
  }
  if (account.balance > 0) {
    return res.status(400).json({ message: 'Account balance must be zero before closure' });
  }
  if (account.owner.toString() === req.user._id.toString()) {
    return res.status(403).json({ message: 'You cannot approve closure of your own account' });
  }
  const closed = await Account.findOneAndUpdate(
    { _id: account._id, status: 'PendingClosure', balance: 0 },
    { status: 'Closed' },
    { new: true }
  );
  if (!closed) return res.status(409).json({ message: 'Account changed, please retry' });
  res.json(closed);
}

async function rejectClosure(req, res) {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });
  if (account.status !== 'PendingClosure') {
    return res.status(400).json({ message: 'Account is not pending closure' });
  }
  const reopened = await Account.findOneAndUpdate(
    { _id: account._id, status: 'PendingClosure' },
    { status: 'Active' },
    { new: true }
  );
  if (!reopened) return res.status(409).json({ message: 'Account changed, please retry' });
  res.json(reopened);
}

module.exports = {
  createAccount,
  getMyAccounts,
  getAccountById,
  listAllAccounts,
  requestClosure,
  approveClosure,
  rejectClosure,
};
