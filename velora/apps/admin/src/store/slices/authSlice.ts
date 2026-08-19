import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  endpoints,
  isNormalizedApiError,
  VELORA_ROLES,
  type AuthResponse,
  type LoginRequest,
  type PermissionCode,
  type UserProfile,
} from '@velora/shared';
import { apiClient } from '@/lib/apiClient';
import type { RootState } from '../index';

export interface AuthState {
  user: UserProfile | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
  initialized: boolean;
}

const persisted = apiClient.getSession();

const initialState: AuthState = {
  user: persisted?.user ?? null,
  status: persisted ? 'authenticated' : 'idle',
  error: null,
  initialized: false,
};

/** Only staff roles may hold a back-office session. */
const BACK_OFFICE_ROLES: string[] = [VELORA_ROLES.Admin, VELORA_ROLES.Manager];

const isBackOffice = (user: UserProfile): boolean =>
  user.roles.some((role) => BACK_OFFICE_ROLES.includes(role));

export const login = createAsyncThunk<UserProfile, LoginRequest, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<AuthResponse>(endpoints.auth.login, credentials);

      // Reject a customer account before storing anything: the API would refuse
      // every admin call anyway, and a half-signed-in state is worse than none.
      if (!isBackOffice(response.user)) {
        return rejectWithValue('Bu hesabın yönetim paneline erişim yetkisi yok.');
      }

      apiClient.setSession(response);
      return response.user;
    } catch (error) {
      return rejectWithValue(
        isNormalizedApiError(error) ? error.message : 'Giriş yapılamadı.',
      );
    }
  },
);

export const logout = createAsyncThunk<void, void>('auth/logout', async () => {
  const session = apiClient.getSession();

  if (session?.refreshToken) {
    try {
      await apiClient.post(endpoints.auth.logout, { refreshToken: session.refreshToken });
    } catch {
      /* best effort */
    }
  }

  apiClient.clearSession();
});

export const restoreSession = createAsyncThunk<UserProfile | null, void>('auth/restore', async () => {
  if (!apiClient.getSession()) return null;

  try {
    const profile = await apiClient.get<UserProfile>(endpoints.auth.me);

    if (!isBackOffice(profile)) {
      apiClient.clearSession();
      return null;
    }

    return profile;
  } catch {
    apiClient.clearSession();
    return null;
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Giriş yapılamadı.';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'authenticated' : 'idle';
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.status = 'idle';
        state.initialized = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        state.error = null;
      });
  },
});

export const { clearAuthError } = authSlice.actions;

export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.user !== null;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectAuthInitialized = (state: RootState) => state.auth.initialized;

/**
 * Permission check mirroring the server policy: Admin is a superuser, everyone
 * else needs the explicit claim. Used to hide controls the API would reject.
 */
export const selectHasPermission =
  (permission: PermissionCode) =>
  (state: RootState): boolean => {
    const user = state.auth.user;
    if (!user) return false;

    return user.roles.includes(VELORA_ROLES.Admin) || user.permissions.includes(permission);
  };

export default authSlice.reducer;
