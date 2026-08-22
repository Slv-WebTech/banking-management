import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import TransactionTable from './TransactionTable';

const baseFilters = { search: '', type: '', status: '' };

function makeTx(overrides = {}) {
  return {
    _id: 'abcdef0123456789',
    createdAt: '2026-08-16T12:00:00.000Z',
    type: 'transfer-debit',
    amount: 100,
    status: 'completed',
    balanceAfter: 900,
    ...overrides,
  };
}

describe('TransactionTable', () => {
  test('shows an empty state when there are no transactions', () => {
    render(
      <TransactionTable
        transactions={[]}
        page={1}
        pages={1}
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  // Regression test: TransactionTable used to label every non-transfer-credit
  // transaction as "Debit", which meant deposits displayed as debits.
  test('labels each transaction type correctly, including deposit', () => {
    render(
      <TransactionTable
        transactions={[
          makeTx({ _id: 'tx-debit', type: 'transfer-debit' }),
          makeTx({ _id: 'tx-credit', type: 'transfer-credit' }),
          makeTx({ _id: 'tx-deposit', type: 'deposit' }),
        ]}
        page={1}
        pages={1}
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onPageChange={vi.fn()}
      />
    );
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(rows[0]).toHaveTextContent('Debit');
    expect(rows[1]).toHaveTextContent('Credit');
    expect(rows[2]).toHaveTextContent('Deposit');
    expect(rows[2]).not.toHaveTextContent('Debit');
  });

  test('formats amount and balance as INR with the ₹ symbol', () => {
    render(
      <TransactionTable
        transactions={[makeTx({ amount: 12345, balanceAfter: 6789 })]}
        page={1}
        pages={1}
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('₹12,345')).toBeInTheDocument();
    expect(screen.getByText('₹6,789')).toBeInTheDocument();
  });

  test('shows the Account column only when showAccountColumn is set', () => {
    const { rerender } = render(
      <TransactionTable
        transactions={[]}
        page={1}
        pages={1}
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.queryByText('Account')).not.toBeInTheDocument();

    rerender(
      <TransactionTable
        transactions={[]}
        page={1}
        pages={1}
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onPageChange={vi.fn()}
        showAccountColumn
      />
    );
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  test('Previous is disabled on page 1, Next is disabled on the last page', () => {
    render(
      <TransactionTable
        transactions={[makeTx()]}
        page={1}
        pages={1}
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText('Next')).toBeDisabled();
  });

  test('clicking Next calls onPageChange with the next page number', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <TransactionTable
        transactions={[makeTx()]}
        page={1}
        pages={3}
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onPageChange={onPageChange}
      />
    );
    await user.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  test('typing in the search box calls onFilterChange with the updated filters', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <TransactionTable
        transactions={[]}
        page={1}
        pages={1}
        filters={baseFilters}
        onFilterChange={onFilterChange}
        onPageChange={vi.fn()}
      />
    );
    await user.type(screen.getByPlaceholderText('Search by reference, account, or note...'), 'x');
    expect(onFilterChange).toHaveBeenCalledWith({ ...baseFilters, search: 'x' });
  });
});
