import type { UserProfile } from '@velora/shared';
import { describe, expect, it } from 'vitest';
import reducer, {
  clearAuthError,
  login,
  logout,
  restoreSession,
  setUser,
  type AuthState,
} from './authSlice';

const user: UserProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'musteri@velora.com',
  userName: 'musteri',
  firstName: 'Uhut',
  lastName: 'Sancar',
  fullName: 'Uhut Sancar',
  phoneNumber: null,
  isActive: true,
  createdAtUtc: '2026-01-01T00:00:00Z',
  lastLoginAtUtc: null,
  roles: ['Customer'],
  permissions: ['products.read'],
};

const initial: AuthState = { user: null, status: 'idle', error: null, initialized: false };

describe('authSlice', () => {
  it('enters the loading state while a login is in flight', () => {
    const state = reducer(initial, { type: login.pending.type });

    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
  });

  it('stores the profile on a successful login', () => {
    const state = reducer(initial, { type: login.fulfilled.type, payload: user });

    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(user);
  });

  it('surfaces the rejection message', () => {
    const state = reducer(initial, { type: login.rejected.type, payload: 'Invalid credentials.' });

    expect(state.status).toBe('error');
    expect(state.error).toBe('Invalid credentials.');
    expect(state.user).toBeNull();
  });

  it('falls back to a generic message when the thunk gives none', () => {
    const state = reducer(initial, { type: login.rejected.type, payload: undefined });

    expect(state.error).toBe('Beklenmeyen bir hata oluştu.');
  });

  it('clears the error without touching the session', () => {
    const errored: AuthState = { ...initial, user, status: 'authenticated', error: 'boom' };

    const state = reducer(errored, clearAuthError());

    expect(state.error).toBeNull();
    expect(state.user).toEqual(user);
  });

  it('marks the session initialised once restore resolves', () => {
    const state = reducer(initial, { type: restoreSession.fulfilled.type, payload: user });

    expect(state.initialized).toBe(true);
    expect(state.status).toBe('authenticated');
  });

  it('treats a null restore payload as signed out but initialised', () => {
    const state = reducer(initial, { type: restoreSession.fulfilled.type, payload: null });

    expect(state.initialized).toBe(true);
    expect(state.status).toBe('idle');
    expect(state.user).toBeNull();
  });

  it('marks the session initialised even when restore fails', () => {
    const state = reducer(initial, { type: restoreSession.rejected.type });

    expect(state.initialized).toBe(true);
    expect(state.user).toBeNull();
  });

  it('drops the user on logout', () => {
    const signedIn: AuthState = { ...initial, user, status: 'authenticated' };

    const state = reducer(signedIn, { type: logout.fulfilled.type });

    expect(state.user).toBeNull();
    expect(state.status).toBe('idle');
  });

  it('accepts a profile update from the account page', () => {
    const updated = { ...user, firstName: 'Yeni' };

    const state = reducer(initial, setUser(updated));

    expect(state.user?.firstName).toBe('Yeni');
    expect(state.status).toBe('authenticated');
  });
});
