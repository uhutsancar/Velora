import { useTranslation } from 'react-i18next';
import { persistLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@velora/shared';
import { cn } from '@/utils/cn';

/** Two-language toggle. Persists the choice so it survives a reload. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  const change = (language: SupportedLanguage) => {
    if (language === i18n.language) return;

    void i18n.changeLanguage(language);
    persistLanguage(language);
  };

  return (
    <div className={cn('flex items-center gap-1', className)} role="group" aria-label="Dil seçimi">
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => change(language)}
          aria-pressed={i18n.language === language}
          className={cn(
            'label-caps px-1.5 py-1 transition-colors',
            i18n.language === language ? 'text-ink-900' : 'text-ink-300 hover:text-ink-600',
          )}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
