import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'employee') navigate('/employee');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
          <h1 className="auth-headline">Banking, simplified.</h1>
          <p className="auth-sub">
            One secure place to manage your accounts, move money, and keep an eye on every
            transaction.
          </p>
          <div className="auth-features">
            <div className="auth-feature">
              <span className="card-icon">
                <Icon name="shieldCheck" size={18} />
              </span>
              <div>
                <strong>Bank-grade authentication</strong>
                <p>Your session is protected with secure, token-based sign-in.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="card-icon">
                <Icon name="arrowLeftRight" size={18} />
              </span>
              <div>
                <strong>Instant transfers</strong>
                <p>Send funds to any account number in seconds.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="card-icon">
                <Icon name="clock" size={18} />
              </span>
              <div>
                <strong>Real-time activity</strong>
                <p>Track balances and transaction history as it happens.</p>
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
            <h2>Welcome back</h2>
            <p className="form-lede">Sign in to access your accounts.</p>

            {error && (
              <p className="error-text">
                <Icon name="alertCircle" size={16} /> {error}
              </p>
            )}

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
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="input-group">
                <Icon className="input-icon" size={16} name="lock" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
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
              {submitting ? 'Logging in...' : 'Login'}
            </Button>

            <p className="auth-footer-link">
              No account? <Link to="/register">Register</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
