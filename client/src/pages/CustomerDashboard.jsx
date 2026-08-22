import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import AccountCard from '../components/AccountCard.jsx';
import DepositForm from '../components/DepositForm.jsx';
import TransferForm from '../components/TransferForm.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonCards, SkeletonRows } from '../components/ui/Skeleton.jsx';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [openingAccount, setOpeningAccount] = useState(false);
  const [moneyTab, setMoneyTab] = useState('deposit');

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

  if (loading) {
    return (
      <div>
        <SkeletonCards count={3} />
        <SkeletonRows count={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
          <p className="page-subtitle">Here's what's happening with your accounts today.</p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="primary"
            icon={<Icon name="plus" size={16} />}
            loading={openingAccount}
            onClick={handleOpenAccount}
          >
            {openingAccount ? 'Opening...' : 'Open new account'}
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="No accounts yet"
          description="Open your first account to start depositing and transferring funds."
          action={
            <Button
              variant="primary"
              icon={<Icon name="plus" size={16} />}
              loading={openingAccount}
              onClick={handleOpenAccount}
            >
              Open your first account
            </Button>
          }
        />
      ) : (
        <div className="account-grid">
          {accounts.map((acc) => (
            <AccountCard key={acc._id} account={acc} />
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <>
          <div className="section-title">
            <h2>Move Money</h2>
          </div>
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={moneyTab === 'deposit'}
              className={`tab ${moneyTab === 'deposit' ? 'active' : ''}`}
              onClick={() => setMoneyTab('deposit')}
            >
              Deposit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={moneyTab === 'transfer'}
              className={`tab ${moneyTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setMoneyTab('transfer')}
            >
              Transfer
            </button>
          </div>
          {moneyTab === 'deposit' ? (
            <DepositForm
              accounts={accounts.filter((a) => a.status === 'Active')}
              onDepositComplete={() => {
                loadAccounts();
                loadTransactions();
              }}
            />
          ) : (
            <TransferForm
              accounts={accounts.filter((a) => a.status === 'Active')}
              onTransferComplete={() => {
                loadAccounts();
                loadTransactions();
              }}
            />
          )}

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
