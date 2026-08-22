import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

const TYPE_LABELS = {
  'transfer-credit': 'Credit',
  'transfer-debit': 'Debit',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
};

const STATUS_TONE = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
};

const TYPE_ICONS = {
  'transfer-credit': 'arrowDown',
  'transfer-debit': 'arrowLeftRight',
  deposit: 'arrowDown',
  withdrawal: 'arrowLeftRight',
};

function amountClass(type) {
  if (type === 'transfer-credit' || type === 'deposit') return 'amount-credit';
  if (type === 'transfer-debit' || type === 'withdrawal') return 'amount-debit';
  return '';
}

export default function TransactionTable({
  transactions,
  page,
  pages,
  filters,
  onFilterChange,
  onPageChange,
  showAccountColumn,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Transaction History</h3>
      </div>
      <div className="filters-bar">
        <div className="input-group">
          <Icon name="search" size={16} className="input-icon" />
          <input
            type="text"
            placeholder="Search by reference..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          />
        </div>
        <select value={filters.type} onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          <option value="transfer-debit">Debit</option>
          <option value="transfer-credit">Credit</option>
          <option value="deposit">Deposit</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Date</th>
              {showAccountColumn && <th>Account</th>}
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Available Balance</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={showAccountColumn ? 7 : 6} className="table-empty">
                  <Icon name="inbox" size={22} />
                  No transactions found
                </td>
              </tr>
            )}
            {transactions.map((tx) => (
              <tr key={tx._id}>
                <td className="cell-muted">{tx._id.slice(-8)}</td>
                <td className="cell-muted">{new Date(tx.createdAt).toLocaleString()}</td>
                {showAccountColumn && <td>{tx.account?.accountNumber || '-'}</td>}
                <td>
                  <Icon
                    name={TYPE_ICONS[tx.type] || 'arrowLeftRight'}
                    size={14}
                    style={amountClass(tx.type) === 'amount-debit' ? { transform: 'rotate(180deg)' } : undefined}
                  />{' '}
                  {TYPE_LABELS[tx.type] || tx.type}
                </td>
                <td className={amountClass(tx.type)}>₹{tx.amount.toLocaleString('en-IN')}</td>
                <td>
                  <Badge tone={STATUS_TONE[tx.status] || 'neutral'}>{tx.status}</Badge>
                </td>
                <td>₹{tx.balanceAfter.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevronLeft" size={14} />
          Previous
        </button>
        <span className="pagination-status">
          Page {page} of {pages || 1}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}
