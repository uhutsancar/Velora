import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Price } from '@/components/ui/Display';
import { Spinner } from '@/components/ui/Feedback';
import { useDebounce, useScrollLock } from '@/hooks';
import { useSearchProductsQuery } from '@/store/api/catalogApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSearchOpen, toggleSearch } from '@/store/slices/uiSlice';
import { mediaUrl, PRODUCT_PLACEHOLDER } from '@/utils/media';

const SUGGESTION_KEYS = [
  'search.suggestionBag',
  'search.suggestionWallet',
  'search.suggestionCardHolder',
  'search.suggestionTravel',
  'search.suggestionBelt',
];
const MIN_QUERY_LENGTH = 2;

export function SearchOverlay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const open = useAppSelector(selectSearchOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState('');

  // Debounced so typing does not fire a request per keystroke.
  const debouncedTerm = useDebounce(term, 300);

  useScrollLock(open);

  const { data, isFetching } = useSearchProductsQuery(
    { search: debouncedTerm, pageSize: 6 },
    { skip: debouncedTerm.trim().length < MIN_QUERY_LENGTH },
  );

  useEffect(() => {
    if (open) {
      // Delay one frame so the input exists before we focus it.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }

    setTerm('');
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch(toggleSearch(false));
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dispatch]);

  const submit = (value: string) => {
    const query = value.trim();
    if (query.length === 0) return;

    dispatch(toggleSearch(false));
    navigate(`/arama?q=${encodeURIComponent(query)}`);
  };

  const results = data?.items ?? [];
  const showResults = debouncedTerm.trim().length >= MIN_QUERY_LENGTH;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[95] bg-sand-50"
          role="dialog"
          aria-modal="true"
          aria-label={t('common.search')}
        >
          <div className="container-velora flex h-[var(--velora-header-height)] items-center justify-between">
            <span className="font-display text-xl tracking-[0.28em] text-ink-900">VELORA</span>
            <button
              type="button"
              onClick={() => dispatch(toggleSearch(false))}
              aria-label={t('common.close')}
              className="p-2 text-ink-600 transition-colors hover:text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="container-velora max-w-3xl">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit(term);
              }}
              className="flex items-center gap-3 border-b border-ink-900 py-4"
            >
              <Search className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={t('nav.search')}
                aria-label={t('nav.search')}
                className="w-full bg-transparent font-display text-2xl text-ink-900 placeholder:text-ink-300 focus:outline-none"
              />
              {isFetching && <Spinner className="h-4 w-4" />}
            </form>

            {!showResults && (
              <div className="mt-8">
                <p className="label-caps mb-3 text-ink-400">{t('search.popular')}</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTION_KEYS.map((key) => t(key)).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => submit(suggestion)}
                      className="border border-ink-200 px-3 py-1.5 text-sm text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showResults && (
              <div className="mt-8 max-h-[60vh] overflow-y-auto">
                {results.length === 0 && !isFetching ? (
                  <p className="py-10 text-center text-sm text-ink-500">{t('catalog.noResults')}</p>
                ) : (
                  <>
                    <ul className="divide-y divide-ink-100">
                      {results.map((product) => (
                        <li key={product.id}>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch(toggleSearch(false));
                              navigate(`/urun/${product.slug}`);
                            }}
                            className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-sand-100"
                          >
                            <img
                              src={mediaUrl(product.primaryImageUrl) ?? PRODUCT_PLACEHOLDER}
                              alt=""
                              loading="lazy"
                              className="h-16 w-14 shrink-0 object-cover"
                            />
                            <span className="flex-1">
                              <span className="block text-sm font-medium text-ink-900">{product.name}</span>
                              {product.brandName && (
                                <span className="block text-xs text-ink-400">{product.brandName}</span>
                              )}
                            </span>
                            <Price value={product.effectivePrice} size="sm" />
                          </button>
                        </li>
                      ))}
                    </ul>

                    {data && data.totalCount > results.length && (
                      <button
                        type="button"
                        onClick={() => submit(term)}
                        className="label-caps mt-6 w-full border border-ink-900 py-3 text-ink-900 transition-colors hover:bg-ink-900 hover:text-sand-50"
                      >
                        {t('common.results', { count: data.totalCount })}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
