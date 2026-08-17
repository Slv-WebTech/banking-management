import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employee' ? '/employee' : '/dashboard';

  return (
    <nav className="navbar">
      <Link to={user ? dashboardPath : '/'} className="navbar-brand">
        🏦 Banking Management
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <span className="navbar-user">
              {user.name} ({user.role})
            </span>
            <button type="button" onClick={handleLogout} className="btn-link">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
