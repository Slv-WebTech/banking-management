import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './ui/Icon.jsx';

const NAV_ITEMS = {
  customer: [
    { to: '/dashboard', label: 'Dashboard', icon: 'layout' },
    { to: '/loans', label: 'Loans', icon: 'banknote' },
  ],
  employee: [{ to: '/employee', label: 'Operations', icon: 'building' }],
  admin: [
    { to: '/admin', label: 'Overview', icon: 'layout' },
    { to: '/employee', label: 'Operations', icon: 'building' },
  ],
};

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function navLinkClass({ isActive }) {
  return 'nav-link' + (isActive ? ' active' : '');
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employee' ? '/employee' : '/dashboard';
  const navItems = user ? NAV_ITEMS[user.role] || [] : [];

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <nav className="app-header">
      <div className="app-header-inner">
        <Link to={user ? dashboardPath : '/'} className="brand">
          <span className="brand-mark">
            <Icon name="landmark" size={18} />
          </span>
          Banking Management
        </Link>

        {user && (
          <div className="nav-links">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <Icon name={item.icon} size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="header-actions">
          {user ? (
            <>
              <button
                type="button"
                className="menu-toggle"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <Icon name={mobileOpen ? 'x' : 'menu'} size={18} />
              </button>

              <div className="user-menu" ref={menuRef}>
                <button
                  type="button"
                  className="user-menu-trigger"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span className="avatar">{initials(user.name)}</span>
                  <span className="user-menu-name">
                    <strong>{user.name}</strong>
                    <span>{user.role}</span>
                  </span>
                  <Icon name="chevronDown" size={16} />
                </button>

                {menuOpen && (
                  <div className="user-menu-panel" role="menu">
                    <div className="user-menu-header">
                      <strong>{user.name}</strong>
                      {user.email && <span>{user.email}</span>}
                    </div>
                    <button type="button" className="user-menu-item" onClick={handleLogout}>
                      <Icon name="logOut" size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-links">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </div>
          )}
        </div>
      </div>

      {user && (
        <div className={`mobile-nav${mobileOpen ? ' open' : ''}`}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <Icon name={item.icon} size={16} />
              {item.label}
            </NavLink>
          ))}
          <button type="button" className="user-menu-item" onClick={handleLogout}>
            <Icon name="logOut" size={16} />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
