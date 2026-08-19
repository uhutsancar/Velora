import { ChevronDown, Heart, LogOut, Package, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks';
import { useGetCategoryTreeQuery } from '@/store/api/catalogApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectMobileMenuOpen, toggleMobileMenu } from '@/store/slices/uiSlice';
import { logout } from '@/store/slices/authSlice';
import { cn } from '@/utils/cn';
import { LanguageSwitcher } from './LanguageSwitcher';

export function MobileMenu() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectMobileMenuOpen);
  const { user, isAuthenticated } = useAuth();

  const { data: categories = [] } = useGetCategoryTreeQuery();
  const [expanded, setExpanded] = useState<number | null>(null);

  const close = () => dispatch(toggleMobileMenu(false));

  return (
    <Drawer open={open} onClose={close} title={t('nav.menu')} side="left">
      <nav aria-label="Mobil menü" className="flex flex-col">
        <ul className="divide-y divide-ink-100">
          {categories.map((category) => {
            const hasChildren = category.children.length > 0;
            const isExpanded = expanded === category.id;

            return (
              <li key={category.id}>
                <div className="flex items-center justify-between">
                  <Link
                    to={`/kategori/${category.slug}`}
                    onClick={close}
                    className="flex-1 px-6 py-4 font-display text-lg text-ink-900"
                  >
                    {category.name}
                  </Link>

                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : category.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${category.name} alt kategorileri`}
                      className="px-6 py-4 text-ink-400"
                    >
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform duration-300', isExpanded && 'rotate-180')}
                      />
                    </button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {hasChildren && isExpanded && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden bg-sand-100"
                    >
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            to={`/kategori/${child.slug}`}
                            onClick={close}
                            className="block px-10 py-3 text-sm text-ink-600"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}

          <li>
            <Link to="/kampanyalar" onClick={close} className="block px-6 py-4 font-display text-lg text-wine-500">
              {t('nav.campaigns')}
            </Link>
          </li>
        </ul>

        <div className="mt-6 border-t border-ink-100 px-6 py-6">
          {isAuthenticated ? (
            <div className="space-y-1">
              <p className="label-caps mb-3 text-ink-400">{user?.fullName}</p>

              <Link to="/hesabim" onClick={close} className="flex items-center gap-3 py-2.5 text-sm text-ink-700">
                <User className="h-4 w-4" aria-hidden /> {t('nav.account')}
              </Link>
              <Link
                to="/hesabim/siparisler"
                onClick={close}
                className="flex items-center gap-3 py-2.5 text-sm text-ink-700"
              >
                <Package className="h-4 w-4" aria-hidden /> {t('nav.orders')}
              </Link>
              <Link
                to="/hesabim/favoriler"
                onClick={close}
                className="flex items-center gap-3 py-2.5 text-sm text-ink-700"
              >
                <Heart className="h-4 w-4" aria-hidden /> {t('nav.wishlist')}
              </Link>

              <button
                type="button"
                onClick={() => {
                  void dispatch(logout());
                  close();
                }}
                className="flex w-full items-center gap-3 py-2.5 text-sm text-wine-500"
              >
                <LogOut className="h-4 w-4" aria-hidden /> {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button to="/giris" fullWidth onClick={close}>
                {t('nav.login')}
              </Button>
              <Button to="/kayit" variant="outline" fullWidth onClick={close}>
                {t('nav.register')}
              </Button>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
    </Drawer>
  );
}
