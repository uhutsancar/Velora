import type { UserProfile } from '../types/identity';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: UserProfile;
}

/**
 * Session persistence.
 *
 * Tokens live in localStorage because both Velora clients are SPAs talking to a
 * separate API origin, where an HttpOnly cookie cannot be read or attached without
 * a same-site backend. The trade-off is mitigated by short-lived access tokens
 * (60 min), rotating refresh tokens with server-side reuse detection, and a strict
 * CSP. Move to HttpOnly cookies if the API is ever served from the same origin.
 */
export interface TokenStorage {
  get(): StoredSession | null;
  set(session: StoredSession): void;
  clear(): void;
  subscribe(listener: (session: StoredSession | null) => void): () => void;
}

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function createTokenStorage(storageKey: string): TokenStorage {
  const listeners = new Set<(session: StoredSession | null) => void>();

  const notify = (session: StoredSession | null) => {
    listeners.forEach((listener) => listener(session));
  };

  return {
    get() {
      if (!isBrowser) return null;

      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as StoredSession;

        // A payload missing either token is unusable; treat it as no session.
        return parsed.accessToken && parsed.refreshToken ? parsed : null;
      } catch {
        return null;
      }
    },

    set(session) {
      if (!isBrowser) return;

      window.localStorage.setItem(storageKey, JSON.stringify(session));
      notify(session);
    },

    clear() {
      if (!isBrowser) return;

      window.localStorage.removeItem(storageKey);
      notify(null);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
