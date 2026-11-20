import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import TransactionTable from '../components/TransactionTable.jsx';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonCards, SkeletonRows } from '../components/ui/Skeleton.jsx';
import { formatMoney } from '../utils/formatMoney';
import { errorMessage } from '../utils/apiError';
import { useDebouncedValue } from '../utils/useDebouncedValue';

const STATUS_TONE = {
  Active: 'success',
  PendingClosure: 'warning',
  Closed: 'danger',
};

const DEFAULT_LOAN_RATE = 10;

export default function EmployeeDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [pendingClosures, setPendingClosures] = useState([]);
  const [actionError, setActionError] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [loading, setLoading] = useState(true);
  const txRequestId = useRef(0);
  const didInit = useRef(false);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const debouncedAccountSearch = useDebouncedValue(accountSearch, 300);
  const debouncedFilters = useDebouncedValue(filters, 300);
  const [closureBusyId, setClosureBusyId] = useState(null);
  const [loanApplications, setLoanApplications] = useState([]);
  const [loanBusyId, setLoanBusyId] = useState(null);
  const [loanRates, setLoanRates] = useState({});

  const loadAccounts = useCallback(async () => {
    const res = await api.get('/accounts/all', { params: debouncedAccountSearch ? { search: debouncedAccountSearch } : {} });
    setAccounts(res.data);
    setTotalAccounts(Number(res.headers['x-total-count']) || res.data.length);
  }, [debouncedAccountSearch]);

  // Independent of the account search box, so closure requests never disappear while searching.
  const loadPendingClosures = useCallback(async () => {
    const res = await api.get('/accounts/all', { params: { status: 'PendingClosure' } });
    setPendingClosures(res.data);
  }, []);

  const loadTransactions = useCallback(async () => {
    const params = { page, ...debouncedFilters };
    Object.keys(params).forEach((key) => !params[key] && delete params[key]);
    const requestId = ++txRequestId.current;
    const res = await api.get('/transactions/all', { params });
    if (requestId !== txRequestId.current) return; // a newer filter change superseded this response
    setTransactions(res.data.items);
    setPages(res.data.pages);
  }, [page, debouncedFilters]);

  const loadLoanApplications = useCallback(async () => {
    const res = await api.get('/loans/all', { params: { status: 'Pending' } });
    setLoanApplications(res.data);
  }, []);

  // After the first load, each search/filter refetches only the list it controls (these two effects
  // run before the initial one on mount, so they see didInit === false and skip).
  useEffect(() => {
    if (didInit.current) loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (didInit.current) loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    // Only the first load shows the skeleton; refetching on search/filter must not unmount the inputs.
    Promise.all([loadAccounts(), loadPendingClosures(), loadTransactions(), loadLoanApplications()]).finally(() => setLoading(false));
    didInit.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(next) {
    setFilters(next);
    setPage(1);
  }

  async function handleApproveClosure(account) {
    setClosureBusyId(account._id);
    setActionError('');
    try {
      await api.post(`/accounts/${account._id}/approve-closure`);
      await Promise.all([loadAccounts(), loadPendingClosures()]);
    } catch (err) {
      setActionError(errorMessage(err, 'Action failed'));
    } finally {
      setClosureBusyId(null);
    }
  }

  async function handleRejectClosure(account) {
    setClosureBusyId(account._id);
    setActionError('');
    try {
      await api.post(`/accounts/${account._id}/reject-closure`);
      await Promise.all([loadAccounts(), loadPendingClosures()]);
    } catch (err) {
      setActionError(errorMessage(err, 'Action failed'));
    } finally {
      setClosureBusyId(null);
    }
  }

  async function handleApproveLoan(loan) {
    setLoanBusyId(loan._id);
    setActionError('');
    try {
      const annualInterestRate = Number(loanRates[loan._id] ?? DEFAULT_LOAN_RATE);
      await api.patch(`/loans/${loan._id}/approve`, { annualInterestRate });
      await Promise.all([loadLoanApplications(), loadAccounts()]);
    } catch (err) {
      setActionError(errorMessage(err, 'Action failed'));
    } finally {
      setLoanBusyId(null);
    }
  }

  async function handleRejectLoan(loan) {
    setLoanBusyId(loan._id);
    setActionError('');
    try {
      await api.patch(`/loans/${loan._id}/reject`, {});
      await loadLoanApplications();
    } catch (err) {
      setActionError(errorMessage(err, 'Action failed'));
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

      {actionError && (
        <p className="error-text" role="alert">
          <Icon name="alertCircle" size={16} /> {actionError}
        </p>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Loan Applications</h3>
        </div>
        {loanApplications.length === 0 ? (
          <EmptyState icon="checkCircle" title="All caught up" description="No loan applications are waiting for review." />
        ) : (
          <div className="table-wrap">
            <table className="table-sticky-actions">
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
                    <td>₹{formatMoney(loan.principal)}</td>
                    <td>{loan.termMonths} mo</td>
                    <td className="cell-muted">{loan.purpose || '-'}</td>
                    <td>
                      <input
                        type="number"
                        aria-label="Annual interest rate (%)"
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
            <table className="table-sticky-actions">
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
                    <td>₹{formatMoney(acc.balance)}</td>
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
              aria-label="Search accounts"
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
                  <td>₹{formatMoney(acc.balance)}</td>
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
        {totalAccounts > accounts.length && (
          <p className="list-note">
            Showing the first {accounts.length} of {totalAccounts} accounts. Search by account number to narrow the list.
          </p>
        )}
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
