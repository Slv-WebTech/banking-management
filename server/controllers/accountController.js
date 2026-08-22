const Account = require('../models/Account');
const generateAccountNumber = require('../utils/generateAccountNumber');

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
  const { search } = req.query;
  const filter = {};
  if (search) {
    filter.accountNumber = { $regex: search, $options: 'i' };
  }
  const accounts = await Account.find(filter).populate('owner', 'name email').sort({ createdAt: -1 });
  res.json(accounts);
}

async function requestClosure(req, res) {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });
  if (account.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (account.balance > 0) {
    return res.status(400).json({ message: 'Account balance must be zero before closure' });
  }
  account.status = 'PendingClosure';
  await account.save();
  res.json(account);
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
  account.status = 'Closed';
  await account.save();
  res.json(account);
}

async function rejectClosure(req, res) {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });
  if (account.status !== 'PendingClosure') {
    return res.status(400).json({ message: 'Account is not pending closure' });
  }
  account.status = 'Active';
  await account.save();
  res.json(account);
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
