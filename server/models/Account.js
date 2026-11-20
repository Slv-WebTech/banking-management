const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true, unique: true },
    accountType: { type: String, enum: ['Savings', 'Current'], default: 'Savings' },
    balance: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: ['Active', 'Closed', 'PendingClosure'], default: 'Active' },
  },
  { timestamps: true }
);

// Every customer request resolves "my accounts" by owner; staff closure queue filters by status.
accountSchema.index({ owner: 1 });
accountSchema.index({ status: 1 });

module.exports = mongoose.model('Account', accountSchema);
