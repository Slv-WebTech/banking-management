const badgeClass = {
  Active: 'badge-active',
  PendingClosure: 'badge-pending',
  Closed: 'badge-closed',
};

export default function AccountCard({ account }) {
  return (
    <div className="account-card">
      <span className={`badge ${badgeClass[account.status] || ''}`}>{account.status}</span>
      <div className="balance">₹{account.balance.toLocaleString('en-IN')}</div>
      <div>{account.accountType} Account</div>
      <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 6 }}>
        A/C No: {account.accountNumber}
      </div>
    </div>
  );
}
