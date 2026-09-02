import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { tr } from './locales/tr';
import { en } from './locales/en';

export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'tr';

const LANGUAGE_STORAGE_KEY = 'velora.language';

export const resources = {
  tr: { translation: tr },
  en: { translation: en },
} as const;

/** Locale tag handed to Intl formatters. */
export const localeFor = (language: string): string => (language === 'en' ? 'en-GB' : 'tr-TR');

export function detectLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
    return stored as SupportedLanguage;
  }

  const browser = window.navigator.language.slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(browser as SupportedLanguage)
    ? (browser as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

export function persistLanguage(language: SupportedLanguage): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = language;
}

/**
 * Both apps share one resource bundle, so a label only ever has to be translated once.
 * Returns the singleton instance so callers can `changeLanguage` without re-importing i18next.
 */
export function initI18n(): I18nInstance {
  if (!i18n.isInitialized) {
    const language = detectLanguage();

    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      interpolation: { escapeValue: false },
      returnNull: false,
      // The bundle ships with the app, so there is nothing to suspend on.
      react: { useSuspense: false },
    });

    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }

  return i18n;
}

export { i18n };
export type TranslationResources = typeof tr;
