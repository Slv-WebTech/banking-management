import { useState } from 'react';
import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

const badgeTone = {
  Active: 'success',
  PendingClosure: 'warning',
  Closed: 'danger',
};

export default function AccountCard({ account }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const isSavings = account.accountType === 'Savings';
  const last4 = account.accountNumber?.slice(-4) || '';

  function handleCopy() {
    navigator.clipboard
      ?.writeText(account.accountNumber)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className={`account-card${isSavings ? '' : ' tone-current'}`}>
      <div className="account-card-top">
        <div className="account-card-type">
          <span className="card-icon">
            <Icon name={isSavings ? 'wallet' : 'banknote'} size={16} />
          </span>
          {account.accountType} Account
        </div>
        <Badge tone={badgeTone[account.status] || 'neutral'}>{account.status}</Badge>
      </div>

      <div className="account-card-balance">
        <div className="account-card-balance-label">Available balance</div>
        <div className="account-card-balance-value">₹{account.balance.toLocaleString('en-IN')}</div>
      </div>

      <div className="account-card-bottom">
        <span className="account-card-number">
          {revealed ? account.accountNumber : `•••• ${last4}`}
        </span>
        <span className="account-card-actions">
          <button
            type="button"
            className="account-card-icon-btn"
            aria-label={revealed ? 'Hide account number' : 'Reveal account number'}
            onClick={() => setRevealed((r) => !r)}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={14} />
          </button>
          <button
            type="button"
            className="account-card-icon-btn"
            aria-label="Copy account number"
            onClick={handleCopy}
          >
            <Icon name={copied ? 'checkCircle' : 'copy'} size={14} />
          </button>
        </span>
      </div>
    </div>
  );
}
