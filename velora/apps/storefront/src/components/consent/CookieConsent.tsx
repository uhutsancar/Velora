import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import {
  ACCEPT_ALL,
  onCookieSettingsRequested,
  OPTIONAL_CATEGORIES,
  readConsent,
  REJECT_ALL,
  saveConsent,
  type CookieCategory,
} from '@/lib/cookieConsent';

/**
 * Cookie consent banner.
 *
 * Anchored to the bottom rather than thrown up as a modal: nothing optional is
 * running while it is open, so blocking the page would be theatre. Accept and
 * reject sit next to each other with the same weight, which is the part most
 * banners get wrong and the part a regulator actually looks at.
 */
export function CookieConsent() {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Record<CookieCategory, boolean>>(REJECT_ALL);

  useEffect(() => {
    // A first paint with the banner already up shifts the page; wait a beat so
    // the hero settles first. Anything optional is off until then anyway.
    const timer = window.setTimeout(() => {
      if (!readConsent()) setOpen(true);
    }, 900);

    const unsubscribe = onCookieSettingsRequested(() => {
      setDraft(readConsent()?.categories ?? REJECT_ALL);
      setExpanded(true);
      setOpen(true);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const decide = useCallback((categories: Record<CookieCategory, boolean>) => {
    saveConsent(categories);
    setOpen(false);
    setExpanded(false);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-[120] border-t border-ink-800 bg-ink-900 text-sand-100"
        >
          <div className="container-velora py-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <Cookie className="mt-0.5 hidden h-6 w-6 shrink-0 text-tan-400 sm:block" aria-hidden />

                <div className="max-w-2xl">
                  <h2 id="cookie-consent-title" className="font-display text-lg text-sand-50">
                    {t('cookie.title')}
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-sand-100/75 text-pretty">
                    {t('cookie.body')}{' '}
                    <Link
                      to="/cerez"
                      className="underline underline-offset-2 transition-colors hover:text-sand-50"
                    >
                      {t('cookie.policyLink')}
                    </Link>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:shrink-0">
                {!expanded && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(true)}
                    className="text-sand-100 hover:bg-white/10 hover:text-sand-50"
                  >
                    {t('cookie.customise')}
                  </Button>
                )}

                {/* Same size, same prominence: refusing must be as easy as accepting. */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => decide(REJECT_ALL)}
                  className="border-sand-50/40 text-sand-50 hover:bg-sand-50 hover:text-ink-900"
                >
                  {t('cookie.rejectAll')}
                </Button>

                <Button variant="secondary" size="sm" onClick={() => decide(ACCEPT_ALL)}>
                  {t('cookie.acceptAll')}
                </Button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                    <CategoryToggle
                      title={t('cookie.necessary')}
                      description={t('cookie.necessaryBody')}
                      checked
                      locked
                    />

                    {OPTIONAL_CATEGORIES.map((category) => (
                      <CategoryToggle
                        key={category}
                        title={t(`cookie.${category}`)}
                        description={t(`cookie.${category}Body`)}
                        checked={draft[category]}
                        onChange={(next) => setDraft((current) => ({ ...current, [category]: next }))}
                      />
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button variant="secondary" size="sm" onClick={() => decide(draft)}>
                      {t('cookie.save')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CategoryToggleProps {
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (next: boolean) => void;
}

function CategoryToggle({ title, description, checked, locked = false, onChange }: CategoryToggleProps) {
  return (
    <label
      className={
        locked
          ? 'flex cursor-not-allowed gap-3 opacity-60'
          : 'flex cursor-pointer gap-3 transition-opacity hover:opacity-90'
      }
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-none border-ink-400 bg-transparent accent-tan-500 focus-visible:ring-2 focus-visible:ring-tan-500"
      />

      <span className="min-w-0">
        <span className="block text-sm font-medium text-sand-50">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-sand-100/60 text-pretty">{description}</span>
      </span>
    </label>
  );
}
