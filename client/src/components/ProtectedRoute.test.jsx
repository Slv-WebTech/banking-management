import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderAt(path, roles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/" element={<div>home page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute roles={roles}>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  test('shows a loading state while auth is resolving', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/protected');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('redirects to /login when there is no user', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/protected');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  test('redirects to / when the role does not match', () => {
    useAuth.mockReturnValue({ user: { role: 'customer' }, loading: false });
    renderAt('/protected', ['admin']);
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  test('renders the protected content when the role matches', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
    renderAt('/protected', ['admin']);
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  test('renders the protected content when no roles restriction is given', () => {
    useAuth.mockReturnValue({ user: { role: 'customer' }, loading: false });
    renderAt('/protected');
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
