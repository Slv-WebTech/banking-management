// Money helpers. Amounts are stored as Numbers with at most 2 decimals; every
// incoming amount goes through parseAmount so floats like 0.1+0.2 noise or
// absurd magnitudes never reach the ledger.
const MAX_TRANSACTION_AMOUNT = Number(process.env.MAX_TRANSACTION_AMOUNT) || 10000000;
const MAX_DEPOSIT_AMOUNT = Number(process.env.MAX_DEPOSIT_AMOUNT) || 100000;

// Returns a number rounded to cents, or null if invalid / out of range.
function parseAmount(value, max = MAX_TRANSACTION_AMOUNT) {
  if (typeof value !== 'number' && typeof value !== 'string') return null; // [1], true, {} are not amounts
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  const cents = Math.round(n * 100);
  if (Math.abs(cents / 100 - n) > 1e-9) return null; // more than 2 decimals
  return cents / 100;
}

// Atomic balance adjustment that rounds to cents inside the database. A plain $inc on a
// double drifts (ten 0.10 deposits -> 1.0000000000000142), which then breaks the exact
// `balance: 0` / `$gte` checks used for closure and debits. Use as the whole update document.
function adjustBalance(delta) {
  return [{ $set: { balance: { $round: [{ $add: ['$balance', delta] }, 2] } } }];
}

module.exports = { adjustBalance, parseAmount, MAX_TRANSACTION_AMOUNT, MAX_DEPOSIT_AMOUNT };
