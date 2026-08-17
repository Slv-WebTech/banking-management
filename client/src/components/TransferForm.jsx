import { useState } from 'react';
import api from '../api/axios';

export default function TransferForm({ accounts, onTransferComplete }) {
  const [fromAccount, setFromAccount] = useState(accounts[0]?._id || '');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const clientRef =
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const res = await api.post('/transactions/transfer', {
        fromAccount,
        toAccountNumber,
        amount: Number(amount),
        description,
        clientRef,
      });
      setSuccess(res.data.message || 'Transfer completed');
      setToAccountNumber('');
      setAmount('');
      setDescription('');
      onTransferComplete?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Transfer Funds</h3>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}
      <div className="field">
        <label htmlFor="fromAccount">From account</label>
        <select id="fromAccount" value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} required>
          {accounts.map((acc) => (
            <option key={acc._id} value={acc._id}>
              {acc.accountNumber} (₹{acc.balance.toLocaleString('en-IN')})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="toAccountNumber">Recipient account number</label>
        <input
          id="toAccountNumber"
          type="text"
          placeholder="Recipient Account"
          required
          value={toAccountNumber}
          onChange={(e) => setToAccountNumber(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          placeholder="Amount"
          min="1"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="description">Note (optional)</label>
        <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting || !accounts.length}>
        {submitting ? 'Transferring...' : 'Transfer'}
      </button>
    </form>
  );
}
