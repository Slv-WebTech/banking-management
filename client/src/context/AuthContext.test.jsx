import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../api/axios';

vi.mock('../api/axios');

function Consumer() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <button onClick={() => login('a@example.com', 'Password123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  test('with no stored token, settles to logged-out without calling the API', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
    expect(api.get).not.toHaveBeenCalled();
  });

  test('with a stored token, restores the session from /auth/me', async () => {
    localStorage.setItem('token', 'fake-token');
    api.get.mockResolvedValueOnce({ data: { email: 'restored@example.com' } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('restored@example.com'));
  });

  test('a stored token that fails /auth/me clears storage and logs out', async () => {
    localStorage.setItem('token', 'stale-token');
    api.get.mockRejectedValueOnce(new Error('401'));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('login stores the token/user and updates state', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { token: 'new-token', user: { email: 'a@example.com' } } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));

    await user.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@example.com'));
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  test('logout clears storage and state', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ email: 'restored@example.com' }));
    api.get.mockResolvedValueOnce({ data: { email: 'restored@example.com' } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('restored@example.com'));

    await user.click(screen.getByText('logout'));

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
