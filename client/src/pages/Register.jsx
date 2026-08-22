import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password, form.phone);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside-content">
          <Link to="/" className="brand" style={{ color: '#fff' }}>
            <span className="brand-mark">
              <Icon name="landmark" size={18} />
            </span>
            Banking Management
          </Link>
          <h1 className="auth-headline">Open an account in minutes.</h1>
          <p className="auth-sub">
            Create your profile, open a savings or current account, and start managing your money.
          </p>
          <div className="auth-features">
            <div className="auth-feature">
              <span className="card-icon">
                <Icon name="wallet" size={18} />
              </span>
              <div>
                <strong>Multiple account types</strong>
                <p>Open savings or current accounts under one profile.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="card-icon">
                <Icon name="users" size={18} />
              </span>
              <div>
                <strong>Role-based access</strong>
                <p>Separate views for customers, employees, and admins.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="card-icon">
                <Icon name="banknote" size={18} />
              </span>
              <div>
                <strong>Clear transaction history</strong>
                <p>Every deposit and transfer is logged and searchable.</p>
              </div>
            </div>
          </div>
        </div>
        <p className="auth-aside-footer">© {new Date().getFullYear()} Banking Management System</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-brand-mobile">
            <Link to="/" className="brand">
              <span className="brand-mark">
                <Icon name="landmark" size={18} />
              </span>
              Banking Management
            </Link>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>Create your account</h2>
            <p className="form-lede">It only takes a minute to get started.</p>

            {error && (
              <p className="error-text">
                <Icon name="alertCircle" size={16} /> {error}
              </p>
            )}

            <div className="field">
              <label className="form-label" htmlFor="name">
                Full name
              </label>
              <div className="input-group">
                <Icon className="input-icon" size={16} name="user" />
                <input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <div className="input-group">
                <Icon className="input-icon" size={16} name="mail" />
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="form-label" htmlFor="phone">
                Phone (optional)
              </label>
              <div className="input-group">
                <Icon className="input-icon" size={16} name="phone" />
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="input-group">
                <Icon className="input-icon" size={16} name="lock" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="input-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="btn-block"
              loading={submitting}
              disabled={submitting}
            >
              {submitting ? 'Creating account...' : 'Register'}
            </Button>

            <p className="auth-footer-link">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
