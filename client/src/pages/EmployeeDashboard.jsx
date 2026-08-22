import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import TransactionTable from '../components/TransactionTable.jsx';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';
import { SkeletonCards, SkeletonRows } from '../components/ui/Skeleton.jsx';

const STATUS_TONE = {
  Active: 'success',
  PendingClosure: 'warning',
  Closed: 'danger',
};

export default function EmployeeDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAccounts(), loadTransactions()]).finally(() => setLoading(false));
  }, [loadAccounts, loadTransactions]);

  function handleFilterChange(next) {
    setFilters(next);
    setPage(1);
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
