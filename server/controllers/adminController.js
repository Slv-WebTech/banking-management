const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const escapeRegex = require('../utils/escapeRegex');
const { parsePaging } = require('../utils/pagination');

async function listUsers(req, res) {
  const { role, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { email: { $regex: escapeRegex(search), $options: 'i' } },
    ];
  }
  const { skip, limit } = parsePaging(req.query);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.set('X-Total-Count', String(total));
  res.json(users);
}

async function updateUserStatus(req, res) {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'status must be active or suspended' });
  }
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot change your own status' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  console.log(`[audit] admin ${req.user._id} set status of ${user._id} to ${status}`);
  res.json(user);
}

async function updateUserRole(req, res) {
  const { role } = req.body;
  if (!['customer', 'employee', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot change your own role' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (user) console.log(`[audit] admin ${req.user._id} set role of ${user._id} to ${role}`);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}

async function systemReport(req, res) {
  const [userCount, accountCount, totalBalanceAgg, transactionCount] = await Promise.all([
    User.countDocuments(),
    Account.countDocuments({ status: 'Active' }),
    Account.aggregate([
      { $match: { status: 'Active' } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]),
    Transaction.countDocuments(),
  ]);

  res.json({
    userCount,
    activeAccountCount: accountCount,
    totalBalance: totalBalanceAgg[0]?.total || 0,
    transactionCount,
  });
}

module.exports = { listUsers, updateUserStatus, updateUserRole, systemReport };
