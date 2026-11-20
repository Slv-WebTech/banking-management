// Whole amounts render without decimals (₹500); fractional amounts always show two (₹5,000.50).
export function formatMoney(value) {
  const n = Number(value) || 0;
  const hasFraction = Math.round(n * 100) % 100 !== 0;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
