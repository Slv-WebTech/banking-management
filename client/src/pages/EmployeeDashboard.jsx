import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import TransactionTable from '../components/TransactionTable.jsx';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonCards, SkeletonRows } from '../components/ui/Skeleton.jsx';

const STATUS_TONE = {
  Active: 'success',
  PendingClosure: 'warning',
  Closed: 'danger',
};

const DEFAULT_LOAN_RATE = 10;

export default function EmployeeDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [closureBusyId, setClosureBusyId] = useState(null);
  const [loanApplications, setLoanApplications] = useState([]);
  const [loanBusyId, setLoanBusyId] = useState(null);
  const [loanRates, setLoanRates] = useState({});

  const loadAccounts = useCallback(async () => {
    const res = await api.get('/accounts/all', { params: accountSearch ? { search: accountSearch } : {} });
    setAccounts(res.data);
  }, [accountSearch]);

  const loadTransactions = useCallback(async () => {
    const params = { page, ...filters };
    Object.keys(params).forEach((key) => !params[key] && delete params[key]);
    const res = await api.get('/transactions/all', { params });
    setTransactions(res.data.items);
    setPages(res.data.pages);
  }, [page, filters]);

  const loadLoanApplications = useCallback(async () => {
    const res = await api.get('/loans/all', { params: { status: 'Pending' } });
    setLoanApplications(res.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAccounts(), loadTransactions(), loadLoanApplications()]).finally(() => setLoading(false));
  }, [loadAccounts, loadTransactions, loadLoanApplications]);

  function handleFilterChange(next) {
    setFilters(next);
    setPage(1);
  }

  const pendingClosures = accounts.filter((acc) => acc.status === 'PendingClosure');

  async function handleApproveClosure(account) {
    setClosureBusyId(account._id);
    try {
      await api.post(`/accounts/${account._id}/approve-closure`);
      await loadAccounts();
    } finally {
      setClosureBusyId(null);
    }
  }

  async function handleRejectClosure(account) {
    setClosureBusyId(account._id);
    try {
      await api.post(`/accounts/${account._id}/reject-closure`);
      await loadAccounts();
    } finally {
      setClosureBusyId(null);
    }
  }

  async function handleApproveLoan(loan) {
    setLoanBusyId(loan._id);
    try {
      const annualInterestRate = Number(loanRates[loan._id] ?? DEFAULT_LOAN_RATE);
      await api.patch(`/loans/${loan._id}/approve`, { annualInterestRate });
      await Promise.all([loadLoanApplications(), loadAccounts()]);
    } finally {
      setLoanBusyId(null);
    }
  }

  async function handleRejectLoan(loan) {
    setLoanBusyId(loan._id);
    try {
      await api.patch(`/loans/${loan._id}/reject`, {});
      await loadLoanApplications();
    } finally {
      setLoanBusyId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <SkeletonCards count={1} />
        <SkeletonRows count={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations</h1>
          <p className="page-subtitle">Look up customer accounts and review transaction activity across the bank.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Loan Applications</h3>
        </div>
        {loanApplications.length === 0 ? (
          <EmptyState icon="checkCircle" title="All caught up" description="No loan applications are waiting for review." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Principal</th>
                  <th>Term</th>
                  <th>Purpose</th>
                  <th>Rate (annual %)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loanApplications.map((loan) => (
                  <tr key={loan._id}>
                    <td>
                      <div className="cell-user-text">
                        <strong>{loan.borrower?.name}</strong>
                        <span>{loan.borrower?.email}</span>
                      </div>
                    </td>
                    <td>₹{loan.principal.toLocaleString('en-IN')}</td>
                    <td>{loan.termMonths} mo</td>
                    <td className="cell-muted">{loan.purpose || '-'}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="input-compact"
                        style={{ width: 80 }}
                        value={loanRates[loan._id] ?? DEFAULT_LOAN_RATE}
                        disabled={loanBusyId === loan._id}
                        onChange={(e) => setLoanRates({ ...loanRates, [loan._id]: e.target.value })}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={loanBusyId === loan._id}
                          onClick={() => handleApproveLoan(loan)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={loanBusyId === loan._id}
                          onClick={() => handleRejectLoan(loan)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Pending Closures</h3>
        </div>
        {pendingClosures.length === 0 ? (
          <EmptyState icon="checkCircle" title="Nothing pending" description="No accounts are waiting on a closure decision." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Owner</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClosures.map((acc) => (
                  <tr key={acc._id}>
                    <td>{acc.accountNumber}</td>
                    <td>
                      <div className="cell-user-text">
                        <strong>{acc.owner?.name}</strong>
                        <span>{acc.owner?.email}</span>
                      </div>
                    </td>
                    <td>₹{acc.balance.toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={closureBusyId === acc._id}
                          onClick={() => handleApproveClosure(acc)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={closureBusyId === acc._id}
                          onClick={() => handleRejectClosure(acc)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Customer Accounts</h3>
        </div>
        <div className="filters-bar">
          <div className="input-group">
            <Icon name="search" size={16} className="input-icon" />
            <input
              type="text"
              placeholder="Search by account number..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc._id}>
                  <td>{acc.accountNumber}</td>
                  <td>
                    <div className="cell-user-text">
                      <strong>{acc.owner?.name}</strong>
                      <span>{acc.owner?.email}</span>
                    </div>
                  </td>
                  <td>{acc.accountType}</td>
                  <td>₹{acc.balance.toLocaleString('en-IN')}</td>
                  <td>
                    <Badge tone={STATUS_TONE[acc.status] || 'neutral'}>{acc.status}</Badge>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No accounts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionTable
        transactions={transactions}
        page={page}
        pages={pages}
        filters={filters}
        onFilterChange={handleFilterChange}
        onPageChange={setPage}
        showAccountColumn
      />
    </div>
  );
}
