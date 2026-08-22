const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    principal: { type: Number, required: true },
    interest: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Due', 'Paid'], default: 'Due' },
    paidAt: { type: Date },
  },
  { _id: false }
);

const loanSchema = new mongoose.Schema(
  {
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    disbursalAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    principal: { type: Number, required: true, min: 1 },
    termMonths: { type: Number, required: true, min: 1, max: 360 },
    purpose: { type: String, trim: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Closed'], default: 'Pending', index: true },
    annualInterestRate: { type: Number, min: 0, max: 100 },
    emiAmount: { type: Number },
    schedule: { type: [installmentSchema], default: [] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
