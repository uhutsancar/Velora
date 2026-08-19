import { PERMISSIONS, VELORA_ROLES, type UserProfile } from '@velora/shared';
import { describe, expect, it } from 'vitest';
import reducer, {
  clearAuthError,
  login,
  logout,
  restoreSession,
  selectHasPermission,
  type AuthState,
} from './authSlice';
import type { RootState } from '../index';

const admin: UserProfile = {
  id: 'admin-id',
  email: 'admin@velora.com',
  userName: 'admin',
  firstName: 'Velora',
  lastName: 'Admin',
  fullName: 'Velora Admin',
  phoneNumber: null,
  isActive: true,
  createdAtUtc: '2026-01-01T00:00:00Z',
  lastLoginAtUtc: null,
  roles: [VELORA_ROLES.Admin],
  permissions: [],
};

const manager: UserProfile = {
  ...admin,
  id: 'manager-id',
  email: 'manager@velora.com',
  roles: [VELORA_ROLES.Manager],
  permissions: [PERMISSIONS.ProductsRead, PERMISSIONS.ProductsWrite, PERMISSIONS.OrdersRead],
};

const customer: UserProfile = {
  ...admin,
  id: 'customer-id',
  email: 'musteri@velora.com',
  roles: [VELORA_ROLES.Customer],
  permissions: [PERMISSIONS.ProductsRead],
};

const initial: AuthState = { user: null, status: 'idle', error: null, initialized: false };

const stateWith = (user: UserProfile | null): RootState =>
  ({ auth: { ...initial, user } }) as unknown as RootState;

describe('admin authSlice', () => {
  it('stores the profile on a successful login', () => {
    const state = reducer(initial, { type: login.fulfilled.type, payload: admin });

    expect(state.status).toBe('authenticated');
    expect(state.user?.email).toBe('admin@velora.com');
  });

  it('surfaces the rejection reason for a non-staff account', () => {
    const state = reducer(initial, {
      type: login.rejected.type,
      payload: 'Bu hesabın yönetim paneline erişim yetkisi yok.',
    });

    expect(state.status).toBe('error');
    expect(state.user).toBeNull();
    expect(state.error).toContain('yetkisi yok');
  });

  it('clears the session on logout', () => {
    const signedIn: AuthState = { ...initial, user: admin, status: 'authenticated' };

    expect(reducer(signedIn, { type: logout.fulfilled.type }).user).toBeNull();
  });

  it('marks the session initialised after restore', () => {
    expect(reducer(initial, { type: restoreSession.fulfilled.type, payload: admin }).initialized).toBe(true);
    expect(reducer(initial, { type: restoreSession.rejected.type }).initialized).toBe(true);
  });

  it('clears the error message on demand', () => {
    const errored: AuthState = { ...initial, error: 'boom' };
    expect(reducer(errored, clearAuthError()).error).toBeNull();
  });
});

describe('selectHasPermission', () => {
  it('treats Admin as a superuser even with no explicit claims', () => {
    // Mirrors the server policy in Velora.Shared.JwtAuthRegistration.
    expect(selectHasPermission(PERMISSIONS.SettingsWrite)(stateWith(admin))).toBe(true);
    expect(selectHasPermission(PERMISSIONS.UsersWrite)(stateWith(admin))).toBe(true);
  });

  it('grants a Manager only the claims they hold', () => {
    expect(selectHasPermission(PERMISSIONS.ProductsWrite)(stateWith(manager))).toBe(true);
    expect(selectHasPermission(PERMISSIONS.UsersWrite)(stateWith(manager))).toBe(false);
  });

  it('denies a customer any back-office permission', () => {
    expect(selectHasPermission(PERMISSIONS.ProductsWrite)(stateWith(customer))).toBe(false);
    expect(selectHasPermission(PERMISSIONS.AnalyticsRead)(stateWith(customer))).toBe(false);
  });

  it('denies everything when signed out', () => {
    expect(selectHasPermission(PERMISSIONS.ProductsRead)(stateWith(null))).toBe(false);
  });
});
