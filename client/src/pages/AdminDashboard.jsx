import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import { SkeletonStats, SkeletonRows } from '../components/ui/Skeleton.jsx';
import { formatMoney } from '../utils/formatMoney';
import { errorMessage } from '../utils/apiError';
import { useDebouncedValue } from '../utils/useDebouncedValue';

export default function AdminDashboard() {
  const [report, setReport] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [actionError, setActionError] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const loadUsers = useCallback(async () => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (roleFilter) params.role = roleFilter;
    const res = await api.get('/admin/users', { params });
    setUsers(res.data);
    setTotalUsers(Number(res.headers['x-total-count']) || res.data.length);
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    // Only the first load shows the skeleton; refetching on search/filter must not unmount the inputs.
    Promise.all([api.get('/admin/report').then((res) => setReport(res.data)), loadUsers()]).finally(() =>
      setLoading(false)
    );
  }, [loadUsers]);

  async function toggleStatus(user) {
    setBusyId(user._id);
    setActionError('');
    try {
      const nextStatus = user.status === 'active' ? 'suspended' : 'active';
      await api.patch(`/admin/users/${user._id}/status`, { status: nextStatus });
      await loadUsers();
    } catch (err) {
      setActionError(errorMessage(err, 'Could not update the user'));
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(user, role) {
    setBusyId(user._id);
    setActionError('');
    try {
      await api.patch(`/admin/users/${user._id}/role`, { role });
      await loadUsers();
    } catch (err) {
      setActionError(errorMessage(err, 'Could not update the user'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <SkeletonStats count={4} />
        <SkeletonRows count={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">System-wide metrics and user administration.</p>
        </div>
      </div>

      {report && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-icon">
              <Icon name="users" size={18} />
            </span>
            <div className="value">{report.userCount}</div>
            <div className="label">Total Users</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <Icon name="wallet" size={18} />
            </span>
            <div className="value">{report.activeAccountCount}</div>
            <div className="label">Active Accounts</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <Icon name="banknote" size={18} />
            </span>
            <div className="value">₹{formatMoney(report.totalBalance)}</div>
            <div className="label">Total Balance</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <Icon name="trendingUp" size={18} />
            </span>
            <div className="value">{report.transactionCount}</div>
            <div className="label">Total Transactions</div>
          </div>
        </div>
      )}

      {actionError && (
        <p className="error-text" role="alert">
          <Icon name="alertCircle" size={16} /> {actionError}
        </p>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Manage Users</h3>
        </div>
        <div className="filters-bar">
          <div className="input-group">
            <Icon name="search" size={16} className="input-icon" />
            <input
              type="text"
              aria-label="Search users"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="customer">Customer</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="table-sticky-actions">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="cell-user-text">
                      <strong>{u.name}</strong>
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td>
                    <select aria-label={`Role for ${u.name}`} value={u.role} disabled={busyId === u._id} onChange={(e) => changeRole(u, e.target.value)}>
                      <option value="customer">Customer</option>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <Badge tone={u.status === 'active' ? 'success' : 'danger'}>{u.status}</Badge>
                  </td>
                  <td>
                    <Button
                      variant={u.status === 'active' ? 'danger' : 'secondary'}
                      size="sm"
                      loading={busyId === u._id}
                      onClick={() => toggleStatus(u)}
                    >
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-empty">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalUsers > users.length && (
          <p className="list-note">
            Showing the first {users.length} of {totalUsers} users. Use the search to narrow the list.
          </p>
        )}
      </div>
    </div>
  );
}
