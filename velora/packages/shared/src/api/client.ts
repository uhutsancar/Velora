/* eslint-disable @typescript-eslint/prefer-promise-reject-errors --
 * Rejections carry a plain NormalizedApiError rather than an Error subclass on
 * purpose: RTK Query stores the rejection value in Redux state, and an Error
 * instance is not serialisable there. The shape is guarded by isNormalizedApiError.
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { normalizeApiError, RETRYABLE_STATUSES } from './errors';
import { createTokenStorage, type StoredSession, type TokenStorage } from './tokenStorage';
import type { AuthResponse } from '../types/identity';
import type { NormalizedApiError } from '../types/common';

export interface ApiClientOptions {
  baseUrl: string;
  /** localStorage key the session is persisted under. Storefront and admin use different keys. */
  storageKey: string;
  timeoutMs?: number;
  /** Called after every failed refresh so the app can send the user back to the login page. */
  onUnauthorized?: () => void;
  /** Maximum automatic retries for idempotent requests that fail transiently. */
  maxRetries?: number;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _refreshAttempted?: boolean;
  /** Set on the refresh call itself so the interceptor never recurses. */
  _skipAuthRefresh?: boolean;
}

const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);

export interface ApiClient {
  readonly axios: AxiosInstance;
  readonly tokens: TokenStorage;
  getSession(): StoredSession | null;
  setSession(response: AuthResponse): StoredSession;
  clearSession(): void;
  request<T>(config: AxiosRequestConfig): Promise<T>;
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

/**
 * The single HTTP entry point for both Velora frontends.
 *
 * Responsibilities kept here (and therefore out of components):
 *  - base URL and timeout
 *  - bearer token injection
 *  - one-flight refresh with a waiter queue, so a burst of 401s triggers a single refresh
 *  - error normalisation into {@link NormalizedApiError}
 *  - bounded retry for idempotent requests that fail transiently
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const { baseUrl, storageKey, timeoutMs = 20_000, onUnauthorized, maxRetries = 2 } = options;

  const tokens = createTokenStorage(storageKey);

  const instance = axios.create({
    baseURL: baseUrl.replace(/\/+$/, ''),
    timeout: timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });

  // A single in-flight refresh shared by every queued request.
  let refreshPromise: Promise<StoredSession | null> | null = null;

  const setSession = (response: AuthResponse): StoredSession => {
    const session: StoredSession = {
      accessToken: response.accessToken || response.userToken,
      refreshToken: response.refreshToken,
      expiresAtUtc: response.expiresAtUtc,
      user: response.user,
    };

    tokens.set(session);
    return session;
  };

  const clearSession = () => {
    tokens.clear();
  };

  const refreshSession = async (): Promise<StoredSession | null> => {
    const current = tokens.get();
    if (!current?.refreshToken) return null;

    try {
      const { data } = await instance.post<AuthResponse>(
        '/auth/refresh',
        { refreshToken: current.refreshToken },
        { _skipAuthRefresh: true } as AxiosRequestConfig,
      );

      return setSession(data);
    } catch {
      clearSession();
      return null;
    }
  };

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const session = tokens.get();

    if (session?.accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }

    // Lets the checkout endpoint deduplicate a retried submit.
    if (config.method?.toLowerCase() === 'post' && !config.headers['x-request-id']) {
      config.headers['x-request-id'] = crypto.randomUUID();
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableConfig | undefined;

      if (!config) return Promise.reject(normalizeApiError(error));

      const status = error.response?.status;

      // --- 401: try exactly one refresh, then replay the original request ---
      if (status === 401 && !config._skipAuthRefresh && !config._refreshAttempted) {
        config._refreshAttempted = true;

        refreshPromise ??= refreshSession().finally(() => {
          refreshPromise = null;
        });

        const session = await refreshPromise;

        if (session) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
          return instance.request(config);
        }

        clearSession();
        onUnauthorized?.();

        return Promise.reject(normalizeApiError(error));
      }

      // --- transient failures: bounded retry, idempotent methods only ---
      const method = config.method?.toLowerCase() ?? 'get';
      const isRetryable =
        IDEMPOTENT_METHODS.has(method) &&
        (!status || RETRYABLE_STATUSES.has(status)) &&
        (config._retryCount ?? 0) < maxRetries;

      if (isRetryable) {
        config._retryCount = (config._retryCount ?? 0) + 1;

        // Exponential backoff: 300ms, 600ms, ...
        const delay = 300 * 2 ** (config._retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return instance.request(config);
      }

      return Promise.reject(normalizeApiError(error));
    },
  );

  const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    const response = await instance.request<T>(config);
    return response.data;
  };

  return {
    axios: instance,
    tokens,
    getSession: () => tokens.get(),
    setSession,
    clearSession,
    request,
    get: (url, config) => request({ ...config, url, method: 'GET' }),
    post: (url, data, config) => request({ ...config, url, method: 'POST', data }),
    put: (url, data, config) => request({ ...config, url, method: 'PUT', data }),
    patch: (url, data, config) => request({ ...config, url, method: 'PATCH', data }),
    delete: (url, config) => request({ ...config, url, method: 'DELETE' }),
  };
}

export type { NormalizedApiError, StoredSession, TokenStorage };
