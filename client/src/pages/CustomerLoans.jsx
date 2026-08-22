import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonCards, SkeletonRows } from '../components/ui/Skeleton.jsx';

const STATUS_TONE = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Closed: 'neutral',
};

function makeClientRef() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function LoanCard({ loan, onPay, payingId }) {
  const [expanded, setExpanded] = useState(false);
  const dueInstallment = loan.schedule?.find((i) => i.status === 'Due');

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon-title">
          <span className="card-icon">
            <Icon name="banknote" size={18} />
          </span>
          <div>
            <h3>
              ₹{loan.principal.toLocaleString('en-IN')} · {loan.termMonths} mo
            </h3>
          </div>
        </div>
        <Badge tone={STATUS_TONE[loan.status] || 'neutral'}>{loan.status}</Badge>
      </div>

      <p className="form-lede">
        {loan.purpose || 'No purpose given'} &middot; disbursed to {loan.disbursalAccount?.accountNumber}
      </p>

      {loan.status === 'Pending' && (
        <p className="cell-muted" style={{ fontSize: 'var(--text-sm)' }}>
          Awaiting staff review.
        </p>
      )}

      {loan.status === 'Rejected' && (
        <p className="error-text">
          <Icon name="alertCircle" size={16} /> {loan.reviewNote || 'This application was rejected.'}
        </p>
      )}

      {loan.status === 'Closed' && (
        <p className="success-text">
          <Icon name="checkCircle" size={16} /> Fully repaid.
        </p>
      )}

      {loan.status === 'Approved' && (
        <>
          <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stat-card">
              <div className="value">₹{loan.emiAmount?.toLocaleString('en-IN')}</div>
              <div className="label">Monthly EMI</div>
            </div>
            <div className="stat-card">
              <div className="value">{loan.annualInterestRate}%</div>
              <div className="label">Annual Rate</div>
            </div>
            {dueInstallment && (
              <div className="stat-card">
                <div className="value">₹{dueInstallment.amount.toLocaleString('en-IN')}</div>
                <div className="label">Next EMI Due</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            {dueInstallment && (
              <Button variant="primary" size="sm" loading={payingId === loan._id} onClick={() => onPay(loan, dueInstallment)}>
                Pay next installment
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Hide schedule' : 'View schedule'}
            </Button>
          </div>

          {expanded && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Due date</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.schedule.map((installment) => (
                    <tr key={installment.installmentNumber}>
                      <td className="cell-muted">{installment.installmentNumber}</td>
                      <td className="cell-muted">{new Date(installment.dueDate).toLocaleDateString()}</td>
                      <td>₹{installment.principal.toLocaleString('en-IN')}</td>
                      <td>₹{installment.interest.toLocaleString('en-IN')}</td>
                      <td>₹{installment.amount.toLocaleString('en-IN')}</td>
                      <td>
                        <Badge tone={installment.status === 'Paid' ? 'success' : 'neutral'}>{installment.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CustomerLoans() {
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ disbursalAccount: '', principal: '', termMonths: '', purpose: '' });
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [applying, setApplying] = useState(false);
  const [payingId, setPayingId] = useState(null);

  const loadAccounts = useCallback(async () => {
    const res = await api.get('/accounts/mine');
    setAccounts(res.data.filter((a) => a.status === 'Active'));
  }, []);

  const loadLoans = useCallback(async () => {
    const res = await api.get('/loans/mine');
    setLoans(res.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAccounts(), loadLoans()]).finally(() => setLoading(false));
  }, [loadAccounts, loadLoans]);

  useEffect(() => {
    if (!form.disbursalAccount && accounts.length > 0) {
      setForm((f) => ({ ...f, disbursalAccount: accounts[0]._id }));
    }
  }, [accounts, form.disbursalAccount]);

  async function handleApply(e) {
    e.preventDefault();
    setApplyError('');
    setApplySuccess('');
    setApplying(true);
    try {
      await api.post('/loans', {
        disbursalAccount: form.disbursalAccount,
        principal: Number(form.principal),
        termMonths: Number(form.termMonths),
        purpose: form.purpose,
      });
      setApplySuccess('Loan application submitted');
      setForm((f) => ({ ...f, principal: '', termMonths: '', purpose: '' }));
      await loadLoans();
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Loan application failed');
    } finally {
      setApplying(false);
    }
  }

  async function handlePay(loan, installment) {
    setPayingId(loan._id);
    try {
      await api.post(`/loans/${loan._id}/pay`, {
        account: loan.disbursalAccount._id,
        clientRef: makeClientRef(),
      });
      await Promise.all([loadLoans(), loadAccounts()]);
    } finally {
      setPayingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <SkeletonCards count={2} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">Apply for a loan, track its review status, and repay EMIs.</p>
        </div>
      </div>

      <form className="card" onSubmit={handleApply}>
        <p className="form-lede">Apply for a new loan against one of your active accounts.</p>
        {applyError && (
          <p className="error-text">
            <Icon name="alertCircle" size={16} /> {applyError}
          </p>
        )}
        {applySuccess && (
          <p className="success-text">
            <Icon name="checkCircle" size={16} /> {applySuccess}
          </p>
        )}

        {accounts.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="No active accounts"
            description="Open and fund an active account before applying for a loan."
          />
        ) : (
          <>
            <div className="field">
              <label className="form-label" htmlFor="disbursalAccount">
                Disbursal account
              </label>
              <select
                id="disbursalAccount"
                value={form.disbursalAccount}
                onChange={(e) => setForm({ ...form, disbursalAccount: e.target.value })}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.accountNumber} (₹{acc.balance.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="form-label" htmlFor="principal">
                Principal amount
              </label>
              <input
                id="principal"
                type="number"
                min="1000"
                step="100"
                required
                value={form.principal}
                onChange={(e) => setForm({ ...form, principal: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="form-label" htmlFor="termMonths">
                Term (months)
              </label>
              <input
                id="termMonths"
                type="number"
                min="1"
                max="360"
                required
                value={form.termMonths}
                onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="form-label" htmlFor="purpose">
                Purpose (optional)
              </label>
              <input id="purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </div>
            <Button type="submit" variant="primary" className="btn-block" loading={applying} disabled={applying}>
              {applying ? 'Submitting...' : 'Apply for loan'}
            </Button>
          </>
        )}
      </form>

      <div className="section-title">
        <h2>My Loans</h2>
      </div>

      {loans.length === 0 ? (
        <EmptyState icon="banknote" title="No loans yet" description="Loans you apply for will show up here." />
      ) : (
        loans.map((loan) => <LoanCard key={loan._id} loan={loan} onPay={handlePay} payingId={payingId} />)
      )}
    </div>
  );
}
