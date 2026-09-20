import { createStorageItem, type StorageKey } from '../storage';
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

/**
 * A payload missing either token is unusable — a half-written session is the
 * shape a quota error leaves behind — so it is treated as no session at all.
 */
const isSession = (value: unknown): value is StoredSession => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<StoredSession>;

  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' &&
    candidate.refreshToken.length > 0
  );
};

export function createTokenStorage(storageKey: StorageKey): TokenStorage {
  const item = createStorageItem<StoredSession | null>({
    key: storageKey,
    fallback: null,
    validate: (value): value is StoredSession | null => value === null || isSession(value),
  });

  const listeners = new Set<(session: StoredSession | null) => void>();

  const notify = (session: StoredSession | null) => {
    listeners.forEach((listener) => listener(session));
  };

  // A sign-out in one tab has to sign the others out too, or a stale tab keeps
  // firing requests with a refresh token the server has already revoked.
  item.subscribe(notify);

  return {
    get: () => item.read(),

    set(session) {
      item.write(session);
      notify(session);
    },

    clear() {
      item.remove();
      notify(null);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
