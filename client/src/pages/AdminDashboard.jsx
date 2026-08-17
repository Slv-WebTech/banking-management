import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

export default function AdminDashboard() {
  const [report, setReport] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadUsers = useCallback(async () => {
    const params = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    const res = await api.get('/admin/users', { params });
    setUsers(res.data);
  }, [search, roleFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/admin/report').then((res) => setReport(res.data)), loadUsers()]).finally(() =>
      setLoading(false)
    );
  }, [loadUsers]);

  async function toggleStatus(user) {
    setBusyId(user._id);
    try {
      const nextStatus = user.status === 'active' ? 'suspended' : 'active';
      await api.patch(`/admin/users/${user._id}/status`, { status: nextStatus });
      await loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(user, role) {
    setBusyId(user._id);
    try {
      await api.patch(`/admin/users/${user._id}/role`, { role });
      await loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div>
      <h2>Admin Dashboard</h2>

      {report && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="value">{report.userCount}</div>
            <div className="label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="value">{report.activeAccountCount}</div>
            <div className="label">Active Accounts</div>
          </div>
          <div className="stat-card">
            <div className="value">₹{report.totalBalance.toLocaleString('en-IN')}</div>
            <div className="label">Total Balance</div>
          </div>
          <div className="stat-card">
            <div className="value">{report.transactionCount}</div>
            <div className="label">Total Transactions</div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Manage Users</h3>
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="customer">Customer</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} disabled={busyId === u._id} onChange={(e) => changeRole(u, e.target.value)}>
                      <option value="customer">Customer</option>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.status}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={busyId === u._id}
                      onClick={() => toggleStatus(u)}
                    >
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
