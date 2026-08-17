const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    counterpartyAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    type: {
      type: String,
      enum: ['transfer-debit', 'transfer-credit', 'deposit', 'withdrawal'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    status: { type: String, enum: ['completed', 'failed', 'pending'], default: 'completed' },
    reference: { type: String, required: true, index: true },
    clientRef: { type: String, index: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
