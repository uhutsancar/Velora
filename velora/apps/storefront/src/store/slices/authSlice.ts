import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  endpoints,
  isNormalizedApiError,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  type UserProfile,
  i18n,
} from '@velora/shared';
import { apiClient } from '@/lib/apiClient';
import type { RootState } from '../index';

export interface AuthState {
  user: UserProfile | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
  /** True until the persisted session has been read on first render. */
  initialized: boolean;
}

const persisted = apiClient.getSession();

const initialState: AuthState = {
  user: persisted?.user ?? null,
  status: persisted ? 'authenticated' : 'idle',
  error: null,
  initialized: false,
};

const toMessage = (error: unknown, fallback: string): string =>
  isNormalizedApiError(error) ? error.message : fallback;

export const login = createAsyncThunk<UserProfile, LoginRequest, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<AuthResponse>(endpoints.auth.login, credentials);
      apiClient.setSession(response);
      return response.user;
    } catch (error) {
      return rejectWithValue(toMessage(error, i18n.t('auth.loginFailed')));
    }
  },
);

export const register = createAsyncThunk<UserProfile, RegisterRequest, { rejectValue: string }>(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<AuthResponse>(endpoints.auth.register, payload);
      apiClient.setSession(response);
      return response.user;
    } catch (error) {
      return rejectWithValue(toMessage(error, i18n.t('auth.registerFailed')));
    }
  },
);

export const logout = createAsyncThunk<void, void>('auth/logout', async () => {
  const session = apiClient.getSession();

  if (session?.refreshToken) {
    try {
      // Best effort: the server revokes the refresh token, but a failure here
      // must not stop the client from dropping its own session.
      await apiClient.post(endpoints.auth.logout, { refreshToken: session.refreshToken });
    } catch {
      /* ignored on purpose */
    }
  }

  apiClient.clearSession();
});

/** Re-reads the profile on boot so role/permission changes take effect on reload. */
export const restoreSession = createAsyncThunk<UserProfile | null, void>(
  'auth/restore',
  async () => {
    if (!apiClient.getSession()) return null;

    try {
      return await apiClient.get<UserProfile>(endpoints.auth.me);
    } catch {
      apiClient.clearSession();
      return null;
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    setUser(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
      state.status = 'authenticated';
    },
  },
  extraReducers: (builder) => {
    builder
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

    // Login and register share their pending/fulfilled/rejected handling.
    for (const thunk of [login, register]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = 'loading';
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.user = action.payload;
          state.status = 'authenticated';
          state.error = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.status = 'error';
          state.error = action.payload ?? i18n.t('common.unexpectedError');
        });
    }
  },
});

export const { clearAuthError, setUser } = authSlice.actions;

export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.user !== null;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectAuthInitialized = (state: RootState) => state.auth.initialized;

export default authSlice.reducer;
