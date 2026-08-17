import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import TransactionTable from '../components/TransactionTable.jsx';

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

  if (loading) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div>
      <h2>Employee Dashboard</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Customer Accounts</h3>
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by account number..."
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
          />
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
                    {acc.owner?.name} ({acc.owner?.email})
                  </td>
                  <td>{acc.accountType}</td>
                  <td>₹{acc.balance.toLocaleString('en-IN')}</td>
                  <td>{acc.status}</td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>
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
