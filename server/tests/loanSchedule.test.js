const { calculateEmi, buildAmortizationSchedule, round2 } = require('../utils/loanSchedule');

describe('loanSchedule', () => {
  describe('calculateEmi', () => {
    test('a single-month loan has EMI exactly principal * (1 + monthlyRate)', () => {
      // n=1 collapses the amortization formula to P*(1+r) algebraically, so this
      // is exact and hand-verifiable rather than relying on the formula to check itself.
      expect(calculateEmi(10000, 12, 1)).toBe(10100);
    });

    test('a two-month loan matches a hand-computed value', () => {
      // r = 0.01; EMI = P*(1+r)^2 / (2+r) = 10000*1.0201/2.01 = 5075.124... -> 5075.12
      expect(calculateEmi(10000, 12, 2)).toBe(5075.12);
    });

    test('a 0% interest loan splits the principal evenly', () => {
      expect(calculateEmi(120000, 0, 12)).toBe(10000);
      expect(calculateEmi(100000, 0, 3)).toBe(round2(100000 / 3));
    });

    test('EMI is always positive and finite for realistic inputs', () => {
      const emi = calculateEmi(500000, 8.5, 60);
      expect(emi).toBeGreaterThan(0);
      expect(Number.isFinite(emi)).toBe(true);
    });
  });

  describe('buildAmortizationSchedule', () => {
    test('produces exactly termMonths installments', () => {
      const { schedule } = buildAmortizationSchedule(100000, 10, 24);
      expect(schedule).toHaveLength(24);
    });

    test('installment numbers and due dates are sequential', () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      const { schedule } = buildAmortizationSchedule(60000, 12, 3, start);
      expect(schedule.map((i) => i.installmentNumber)).toEqual([1, 2, 3]);
      expect(new Date(schedule[0].dueDate).getUTCMonth()).toBe(1); // Feb
      expect(new Date(schedule[1].dueDate).getUTCMonth()).toBe(2); // Mar
      expect(new Date(schedule[2].dueDate).getUTCMonth()).toBe(3); // Apr
    });

    test('every installment starts Due', () => {
      const { schedule } = buildAmortizationSchedule(50000, 9, 6);
      expect(schedule.every((i) => i.status === 'Due')).toBe(true);
    });

    test('the sum of principal portions always equals the original principal exactly, regardless of rounding drift', () => {
      const cases = [
        [100000, 12, 12],
        [250000, 10.5, 24],
        [999999, 7.25, 36],
        [1000, 15, 1],
        [500000, 0, 60],
      ];
      for (const [principal, rate, term] of cases) {
        const { schedule } = buildAmortizationSchedule(principal, rate, term);
        const totalPrincipal = round2(schedule.reduce((sum, i) => sum + i.principal, 0));
        expect(totalPrincipal).toBe(round2(principal));
      }
    });

    test('the running balance never goes negative and reaches exactly zero after the final installment', () => {
      const { schedule } = buildAmortizationSchedule(73450, 11.25, 18);
      let balance = 73450;
      for (const installment of schedule) {
        balance = round2(balance - installment.principal);
        expect(balance).toBeGreaterThanOrEqual(0);
      }
      expect(balance).toBe(0);
    });

    test('interest is non-increasing across installments as the balance amortizes down', () => {
      const { schedule } = buildAmortizationSchedule(200000, 14, 12);
      for (let i = 1; i < schedule.length; i += 1) {
        expect(schedule[i].interest).toBeLessThanOrEqual(schedule[i - 1].interest);
      }
    });

    test('a hand-computed two-month, 12% schedule matches exactly', () => {
      const { emi, schedule } = buildAmortizationSchedule(10000, 12, 2, new Date('2026-01-01T00:00:00.000Z'));
      expect(emi).toBe(5075.12);
      expect(schedule[0]).toMatchObject({ installmentNumber: 1, principal: 4975.12, interest: 100, amount: 5075.12 });
      expect(schedule[1]).toMatchObject({ installmentNumber: 2, principal: 5024.88, interest: 50.25, amount: 5075.13 });
    });

    test('a 0% interest schedule has zero interest on every row and amount equals principal portion', () => {
      const { schedule } = buildAmortizationSchedule(90000, 0, 9);
      expect(schedule.every((i) => i.interest === 0)).toBe(true);
      expect(schedule.every((i) => i.amount === i.principal)).toBe(true);
    });

    test('a single-installment loan pays off the full principal plus one month of interest', () => {
      const { schedule } = buildAmortizationSchedule(20000, 12, 1);
      expect(schedule).toHaveLength(1);
      expect(schedule[0].principal).toBe(20000);
      expect(schedule[0].interest).toBe(200); // 20000 * 0.01
      expect(schedule[0].amount).toBe(20200);
    });
  });
});
