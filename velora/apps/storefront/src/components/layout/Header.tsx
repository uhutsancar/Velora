import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useScrollDirection } from '@/hooks';
import { useWishlist } from '@/hooks/useWishlist';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetBasketQuery } from '@/store/api/basketApi';
import { useGetCategoryTreeQuery } from '@/store/api/catalogApi';
import { openCartDrawer, toggleMobileMenu, toggleSearch, selectSearchOpen } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { MegaMenu } from './MegaMenu';
import { LanguageSwitcher } from './LanguageSwitcher';

const ANNOUNCEMENTS = [
  '500 TL üzeri siparişlerde ücretsiz kargo',
  'İlk siparişinize özel %10 indirim: VELORA10',
  '30 gün koşulsuz iade',
];

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { isAuthenticated } = useAuth();
  const { scrolled, direction } = useScrollDirection();
  const searchOpen = useAppSelector(selectSearchOpen);

  const { data: categories = [] } = useGetCategoryTreeQuery();
  const { data: basket } = useGetBasketQuery(undefined, { skip: !isAuthenticated });
  const { count: wishlistCount } = useWishlist();

  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState(0);

  // Rotate the announcement bar. Pure decoration, so it pauses when the tab is hidden.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setAnnouncement((current) => (current + 1) % ANNOUNCEMENTS.length);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  // Any navigation closes the open mega menu.
  useEffect(() => setOpenCategory(null), [location.pathname]);

  const basketCount = basket?.totalQuantity ?? 0;
  const isHome = location.pathname === '/';
  // Hide on scroll down, reveal on scroll up — more room for the product on mobile.
  const hidden = direction === 'down' && !searchOpen && openCategory === null;

  return (
    <>
      <div className="bg-ink-900 text-sand-50">
        <div className="container-velora flex h-9 items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={announcement}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="label-caps text-center"
            >
              {ANNOUNCEMENTS[announcement]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <motion.header
        animate={{ y: hidden ? '-100%' : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onMouseLeave={() => setOpenCategory(null)}
        className={cn(
          'sticky top-0 z-50 border-b transition-colors duration-300',
          scrolled || !isHome
            ? 'border-ink-100 bg-sand-50/95 backdrop-blur-md'
            : 'border-transparent bg-sand-50',
        )}
      >
        <div className="container-velora flex h-[var(--velora-header-height)] items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => dispatch(toggleMobileMenu())}
            aria-label={t('nav.menu')}
            className="-ml-2 p-2 text-ink-800 transition-colors hover:text-ink-950 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="shrink-0" aria-label={t('common.brand')}>
            <span className="font-display text-2xl tracking-[0.28em] text-ink-900">VELORA</span>
          </Link>

          <nav aria-label="Ana menü" className="hidden flex-1 items-center justify-center gap-8 lg:flex">
            {categories.map((category) => (
              <div key={category.id} onMouseEnter={() => setOpenCategory(category.id)}>
                <NavLink
                  to={`/kategori/${category.slug}`}
                  className={({ isActive }) =>
                    cn(
                      'label-caps link-underline py-2 text-ink-700 transition-colors hover:text-ink-950',
                      isActive && 'text-ink-950',
                    )
                  }
                >
                  {category.name}
                </NavLink>
              </div>
            ))}

            <NavLink
              to="/kampanyalar"
              className="label-caps link-underline py-2 text-wine-500 transition-colors hover:text-wine-600"
            >
              {t('nav.campaigns')}
            </NavLink>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher className="hidden sm:flex" />

            <button
              type="button"
              onClick={() => dispatch(toggleSearch())}
              aria-label={t('common.search')}
              className="p-2 text-ink-800 transition-colors hover:text-ink-950"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              to={isAuthenticated ? '/hesabim/favoriler' : '/giris'}
              aria-label={t('nav.wishlist')}
              className="relative hidden p-2 text-ink-800 transition-colors hover:text-ink-950 sm:block"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && <CountBadge value={wishlistCount} />}
            </Link>

            <Link
              to={isAuthenticated ? '/hesabim' : '/giris'}
              aria-label={t('nav.account')}
              className="p-2 text-ink-800 transition-colors hover:text-ink-950"
            >
              <User className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={() => dispatch(openCartDrawer())}
              aria-label={`${t('nav.cart')} (${basketCount})`}
              className="relative p-2 text-ink-800 transition-colors hover:text-ink-950"
            >
              <ShoppingBag className="h-5 w-5" />
              {basketCount > 0 && <CountBadge value={basketCount} />}
            </button>
          </div>
        </div>

        <MegaMenu
          categories={categories}
          openCategoryId={openCategory}
          onClose={() => setOpenCategory(null)}
        />
      </motion.header>
    </>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tan-500 px-1 text-[10px] font-medium leading-none text-white"
    >
      {value > 99 ? '99+' : value}
    </motion.span>
  );
}
