const TYPE_LABELS = {
  'transfer-credit': 'Credit',
  'transfer-debit': 'Debit',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
};

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
      <h3 style={{ marginTop: 0 }}>Transaction History</h3>
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search by reference..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        />
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
                <td colSpan={showAccountColumn ? 7 : 6} style={{ textAlign: 'center', padding: 20 }}>
                  No transactions found
                </td>
              </tr>
            )}
            {transactions.map((tx) => (
              <tr key={tx._id}>
                <td>{tx._id.slice(-8)}</td>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                {showAccountColumn && <td>{tx.account?.accountNumber || '-'}</td>}
                <td>{TYPE_LABELS[tx.type] || tx.type}</td>
                <td>₹{tx.amount.toLocaleString('en-IN')}</td>
                <td>{tx.status}</td>
                <td>₹{tx.balanceAfter.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {pages || 1}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
