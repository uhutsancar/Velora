import { Avatar, Divider, Drawer, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { ExternalLink, LogOut, Menu as MenuIcon, User } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { env } from '@/config/env';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, selectAuthUser } from '@/store/slices/authSlice';
import { selectMobileSidebarOpen, setMobileSidebar } from '@/store/slices/uiSlice';
import { LoadingScreen } from '@/components/ui/Feedback';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { Sidebar } from './Sidebar';

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectAuthUser);
  const mobileOpen = useAppSelector(selectMobileSidebarOpen);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-muted">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <Drawer
        open={mobileOpen}
        onClose={() => dispatch(setMobileSidebar(false))}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { lg: 'none' }, '& .MuiDrawer-paper': { width: 256 } }}
      >
        <Sidebar onNavigate={() => dispatch(setMobileSidebar(false))} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-ink-100 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <IconButton
              onClick={() => dispatch(setMobileSidebar(true))}
              aria-label="Menüyü aç"
              sx={{ display: { lg: 'none' } }}
            >
              <MenuIcon size={20} />
            </IconButton>

            <span className="font-display text-lg tracking-[0.2em] text-ink-900 lg:hidden">VELORA</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')}
              className="label-caps rounded px-2 py-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900"
            >
              {i18n.language === 'tr' ? 'EN' : 'TR'}
            </button>

            <Tooltip title="Mağazayı görüntüle">
              <IconButton component="a" href={env.storefrontUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink size={18} />
              </IconButton>
            </Tooltip>

            <button
              type="button"
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              aria-label="Hesap menüsü"
              className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-ink-50"
            >
              <Avatar sx={{ width: 30, height: 30, bgcolor: '#12100E', fontSize: 13 }}>
                {user?.firstName?.charAt(0).toUpperCase() ?? 'V'}
              </Avatar>

              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-ink-900">
                  {user?.fullName}
                </span>
                <span className="block text-2xs text-ink-400">{user?.roles.join(', ')}</span>
              </span>
            </button>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem disabled>
                <User size={16} className="mr-2" />
                {user?.email}
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  void dispatch(logout());
                }}
              >
                <LogOut size={16} className="mr-2" />
                {t('nav.logout')}
              </MenuItem>
            </Menu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Route chunks stream in behind this boundary. */}
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <ToastViewport />
    </div>
  );
}
