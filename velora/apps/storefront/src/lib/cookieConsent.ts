import { createStorageItem, STORAGE_KEYS } from '@velora/shared';

/**
 * Cookie consent state.
 *
 * KVKK (and the ePrivacy rules the Turkish authority follows) require opt-in for
 * anything beyond strictly necessary cookies, an equally easy way to refuse, and
 * a record of what was consented to. That record is this module: a stored
 * decision with a version and a timestamp, readable by anything that wants to
 * know whether it may run.
 *
 * Nothing here loads a third-party script. Analytics and marketing tags should
 * subscribe to `onConsentChange` and start themselves only when their category
 * turns true, so consent is enforced at the one place it is decided.
 */

export const COOKIE_CATEGORIES = ['necessary', 'preferences', 'analytics', 'marketing'] as const;

export type CookieCategory = (typeof COOKIE_CATEGORIES)[number];

/** Categories the visitor may actually choose between. */
export const OPTIONAL_CATEGORIES = COOKIE_CATEGORIES.filter(
  (category): category is Exclude<CookieCategory, 'necessary'> => category !== 'necessary',
);

export interface CookieConsent {
  /** Bumped when the cookie table changes, which re-asks everyone. */
  version: number;
  decidedAtUtc: string;
  categories: Record<CookieCategory, boolean>;
}

/**
 * Raise this when a new cookie is introduced or an existing one changes purpose.
 * A stored decision from an older version is treated as no decision at all.
 */
export const CONSENT_VERSION = 1;

/** Nothing optional runs until the visitor says so. */
export const REJECT_ALL: Record<CookieCategory, boolean> = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

export const ACCEPT_ALL: Record<CookieCategory, boolean> = {
  necessary: true,
  preferences: true,
  analytics: true,
  marketing: true,
};

const isConsent = (value: unknown): value is CookieConsent => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<CookieConsent>;

  return (
    typeof candidate.version === 'number' &&
    typeof candidate.decidedAtUtc === 'string' &&
    typeof candidate.categories === 'object' &&
    candidate.categories !== null &&
    COOKIE_CATEGORIES.every((category) => typeof candidate.categories?.[category] === 'boolean')
  );
};

const store = createStorageItem<CookieConsent | null>({
  key: STORAGE_KEYS.cookieConsent,
  fallback: null,
  validate: (value): value is CookieConsent | null => value === null || isConsent(value),
});

const listeners = new Set<(consent: CookieConsent | null) => void>();

/** The stored decision, or null when there is none for the current version. */
export function readConsent(): CookieConsent | null {
  const stored = store.read();

  // An outdated decision is not a decision: the visitor never saw this table.
  return stored && stored.version === CONSENT_VERSION ? stored : null;
}

export function saveConsent(categories: Record<CookieCategory, boolean>): CookieConsent {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    decidedAtUtc: new Date().toISOString(),
    // Necessary cookies are not optional, whatever arrives in the argument.
    categories: { ...categories, necessary: true },
  };

  store.write(consent);
  listeners.forEach((listener) => listener(consent));

  return consent;
}

/** True when the given category may run right now. */
export function hasConsent(category: CookieCategory): boolean {
  if (category === 'necessary') return true;

  return readConsent()?.categories[category] ?? false;
}

/**
 * Reopens the consent banner. Withdrawing consent has to be as easy as giving
 * it, so the footer needs a way in without owning the banner's state.
 */
const SETTINGS_EVENT = 'velora:cookie-settings';

export function openCookieSettings(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
}

/** Subscribes the banner to those requests. Returns the unsubscribe. */
export function onCookieSettingsRequested(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  window.addEventListener(SETTINGS_EVENT, listener);
  return () => window.removeEventListener(SETTINGS_EVENT, listener);
}

/** Notifies on a decision here or in another tab. Returns the unsubscribe. */
export function onConsentChange(listener: (consent: CookieConsent | null) => void): () => void {
  listeners.add(listener);
  const unsubscribeCrossTab = store.subscribe(() => listener(readConsent()));

  return () => {
    listeners.delete(listener);
    unsubscribeCrossTab();
  };
}
