import { act, renderHook } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { errorMessage } from './apiError';
import { formatMoney } from './formatMoney';
import { useDebouncedValue } from './useDebouncedValue';
import AccountCard from '../components/AccountCard.jsx';

describe('errorMessage', () => {
  test('prefers the first field-level validation message', () => {
    const err = { response: { data: { message: 'Validation failed', errors: [{ msg: 'Valid email is required' }] } } };
    expect(errorMessage(err, 'x')).toBe('Valid email is required');
  });
  test('falls back to the API message, then the default', () => {
    expect(errorMessage({ response: { data: { message: 'Insufficient balance' } } }, 'x')).toBe('Insufficient balance');
    expect(errorMessage(new Error('network'), 'Transfer failed')).toBe('Transfer failed');
  });
});

describe('formatMoney', () => {
  test('whole amounts have no decimals, fractional amounts always two', () => {
    expect(formatMoney(500)).toBe('500');
    expect(formatMoney(5000.5)).toBe('5,000.50');
    expect(formatMoney(1234567.89)).toBe('12,34,567.89');
  });
});

describe('useDebouncedValue', () => {
  test('only updates after the delay with no further changes', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
    rerender({ v: 'ab' });
    rerender({ v: 'abc' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(2));
    expect(result.current).toBe('abc');
    vi.useRealTimers();
  });
});

describe('AccountCard closure request', () => {
  const base = { _id: '1', accountNumber: '1234567890', accountType: 'Savings', status: 'Active', balance: 0 };

  test('zero-balance active account offers "Request closure"', async () => {
    const onRequestClosure = vi.fn();
    render(<AccountCard account={base} onRequestClosure={onRequestClosure} />);
    await userEvent.click(screen.getByRole('button', { name: 'Request closure' }));
    expect(onRequestClosure).toHaveBeenCalledWith(base);
  });

  test('funded account shows a disabled hint instead', () => {
    render(<AccountCard account={{ ...base, balance: 10 }} onRequestClosure={() => {}} />);
    expect(screen.getByRole('button', { name: 'Closure needs a zero balance' })).toBeDisabled();
  });

  test('no button when pending closure or no handler', () => {
    const { rerender } = render(<AccountCard account={{ ...base, status: 'PendingClosure' }} onRequestClosure={() => {}} />);
    expect(screen.queryByRole('button', { name: /closure/i })).toBeNull();
    rerender(<AccountCard account={base} />);
    expect(screen.queryByRole('button', { name: /closure/i })).toBeNull();
  });
});
