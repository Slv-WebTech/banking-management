const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    counterpartyAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    type: {
      type: String,
      enum: ['transfer-debit', 'transfer-credit', 'deposit', 'withdrawal', 'loan-disbursement', 'loan-repayment'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    status: { type: String, enum: ['completed', 'failed', 'pending'], default: 'completed' },
    reference: { type: String, required: true, index: true },
    clientRef: { type: String },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// One transaction per (account, clientRef): makes idempotent retries race-safe.
transactionSchema.index(
  { account: 1, clientRef: 1 },
  { unique: true, partialFilterExpression: { clientRef: { $type: 'string' } } }
);
transactionSchema.index({ account: 1, createdAt: -1 });
// Staff-wide history (/transactions/all) sorts by createdAt across all accounts.
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
