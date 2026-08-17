import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import AccountCard from '../components/AccountCard.jsx';
import DepositForm from '../components/DepositForm.jsx';
import TransferForm from '../components/TransferForm.jsx';
import TransactionTable from '../components/TransactionTable.jsx';

export default function CustomerDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [openingAccount, setOpeningAccount] = useState(false);

  const loadAccounts = useCallback(async () => {
    const res = await api.get('/accounts/mine');
    setAccounts(res.data);
  }, []);

  const loadTransactions = useCallback(async () => {
    const params = { page, ...filters };
    Object.keys(params).forEach((key) => !params[key] && delete params[key]);
    const res = await api.get('/transactions/mine', { params });
    setTransactions(res.data.items);
    setPages(res.data.pages);
  }, [page, filters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAccounts(), loadTransactions()]).finally(() => setLoading(false));
  }, [loadAccounts, loadTransactions]);

  async function handleOpenAccount() {
    setOpeningAccount(true);
    try {
      await api.post('/accounts', { accountType: 'Savings' });
      await loadAccounts();
    } finally {
      setOpeningAccount(false);
    }
  }

  function handleFilterChange(next) {
    setFilters(next);
    setPage(1);
  }

  if (loading) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="section-title">
        <h2>My Accounts</h2>
        <button className="btn" type="button" onClick={handleOpenAccount} disabled={openingAccount}>
          {openingAccount ? 'Opening...' : '+ Open New Account'}
        </button>
      </div>

      {accounts.length === 0 ? (
        <p>You don't have any accounts yet. Open one to get started.</p>
      ) : (
        <div className="account-grid">
          {accounts.map((acc) => (
            <AccountCard key={acc._id} account={acc} />
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <>
          <DepositForm
            accounts={accounts.filter((a) => a.status === 'Active')}
            onDepositComplete={() => {
              loadAccounts();
              loadTransactions();
            }}
          />

          <TransferForm
            accounts={accounts.filter((a) => a.status === 'Active')}
            onTransferComplete={() => {
              loadAccounts();
              loadTransactions();
            }}
          />

          <TransactionTable
            transactions={transactions}
            page={page}
            pages={pages}
            filters={filters}
            onFilterChange={handleFilterChange}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
