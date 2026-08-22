function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Standard reducing-balance EMI formula. r is the monthly interest rate
// (annualRatePercent / 12 / 100). Falls back to a straight-line split when
// the rate is 0, since the formula divides by zero at r === 0.
function calculateEmi(principal, annualRatePercent, termMonths) {
  const r = annualRatePercent / 12 / 100;
  if (r === 0) return round2(principal / termMonths);
  const factor = (1 + r) ** termMonths;
  return round2((principal * r * factor) / (factor - 1));
}

// Builds a full amortization table. The final installment's principal
// portion is forced to whatever balance remains (rather than the computed
// EMI-minus-interest figure) so the schedule always sums to exactly
// `principal` with no rounding residue left over.
function buildAmortizationSchedule(principal, annualRatePercent, termMonths, startDate) {
  const r = annualRatePercent / 12 / 100;
  const emi = calculateEmi(principal, annualRatePercent, termMonths);
  const base = startDate || new Date();
  let balance = round2(principal);
  const schedule = [];

  for (let i = 1; i <= termMonths; i += 1) {
    const interest = round2(balance * r);
    let principalPortion = i === termMonths ? balance : round2(emi - interest);
    const amount = round2(principalPortion + interest);

    balance = round2(balance - principalPortion);

    const dueDate = new Date(base);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNumber: i,
      dueDate,
      principal: principalPortion,
      interest,
      amount,
      status: 'Due',
    });
  }

  return { emi, schedule };
}

module.exports = { calculateEmi, buildAmortizationSchedule, round2 };
