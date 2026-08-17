import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import DepositForm from './DepositForm';
import api from '../api/axios';

vi.mock('../api/axios');

const accounts = [{ _id: 'acc-1', accountNumber: '1234567890', balance: 500 }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DepositForm', () => {
  test('lists the given accounts in the "To account" select', () => {
    render(<DepositForm accounts={accounts} />);
    expect(screen.getByText('1234567890 (₹500)')).toBeInTheDocument();
  });

  test('the submit button is disabled when there are no accounts', () => {
    render(<DepositForm accounts={[]} />);
    expect(screen.getByRole('button', { name: /deposit/i })).toBeDisabled();
  });

  test('submitting posts the numeric amount and a clientRef, then shows success and clears the form', async () => {
    const user = userEvent.setup();
    const onDepositComplete = vi.fn();
    api.post.mockResolvedValueOnce({ data: { message: 'Deposit successful' } });

    render(<DepositForm accounts={accounts} onDepositComplete={onDepositComplete} />);
    await user.type(screen.getByLabelText('Amount'), '250');
    await user.click(screen.getByRole('button', { name: /deposit/i }));

    expect(await screen.findByText('Deposit successful')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      '/transactions/deposit',
      expect.objectContaining({ account: 'acc-1', amount: 250 })
    );
    expect(api.post.mock.calls[0][1].clientRef).toBeTruthy();
    expect(onDepositComplete).toHaveBeenCalled();
    expect(screen.getByLabelText('Amount')).toHaveValue(null);
  });

  test('a failed deposit shows the server error message and does not clear the form', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Insufficient balance or inactive account' } } });

    render(<DepositForm accounts={accounts} />);
    await user.type(screen.getByLabelText('Amount'), '250');
    await user.click(screen.getByRole('button', { name: /deposit/i }));

    expect(await screen.findByText('Insufficient balance or inactive account')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveValue(250);
  });
});
