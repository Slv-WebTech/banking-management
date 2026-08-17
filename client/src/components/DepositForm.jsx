import { useState } from 'react';
import api from '../api/axios';

export default function DepositForm({ accounts, onDepositComplete }) {
  const [account, setAccount] = useState(accounts[0]?._id || '');
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
      const res = await api.post('/transactions/deposit', {
        account,
        amount: Number(amount),
        description,
        clientRef,
      });
      setSuccess(res.data.message || 'Deposit completed');
      setAmount('');
      setDescription('');
      onDepositComplete?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Deposit Funds</h3>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}
      <div className="field">
        <label htmlFor="depositAccount">To account</label>
        <select id="depositAccount" value={account} onChange={(e) => setAccount(e.target.value)} required>
          {accounts.map((acc) => (
            <option key={acc._id} value={acc._id}>
              {acc.accountNumber} (₹{acc.balance.toLocaleString('en-IN')})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="depositAmount">Amount</label>
        <input
          id="depositAmount"
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
        <label htmlFor="depositDescription">Note (optional)</label>
        <input id="depositDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting || !accounts.length}>
        {submitting ? 'Depositing...' : 'Deposit'}
      </button>
    </form>
  );
}
