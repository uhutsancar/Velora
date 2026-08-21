import {
  BadgePercent,
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Tags,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS, type PermissionCode } from '@velora/shared';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectHasPermission } from '@/store/slices/authSlice';
import { selectSidebarCollapsed, toggleSidebar } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';

interface NavItem {
  to: string;
  end?: boolean;
  icon: typeof LayoutDashboard;
  labelKey: string;
  /** Hidden when the signed-in user lacks this permission. */
  permission?: PermissionCode;
}

const NAV_GROUPS: Array<{ titleKey: string; items: NavItem[] }> = [
  {
    titleKey: 'admin.analytics',
    items: [
      {
        to: '/',
        end: true,
        icon: LayoutDashboard,
        labelKey: 'admin.dashboard',
        permission: PERMISSIONS.AnalyticsRead,
      },
    ],
  },
  {
    titleKey: 'admin.products',
    items: [
      { to: '/products', icon: Package, labelKey: 'admin.products', permission: PERMISSIONS.ProductsRead },
      {
        to: '/categories',
        icon: FolderTree,
        labelKey: 'admin.categories',
        permission: PERMISSIONS.CategoriesWrite,
      },
      { to: '/brands', icon: Tags, labelKey: 'admin.brands', permission: PERMISSIONS.BrandsWrite },
      {
        to: '/reviews',
        icon: MessageSquare,
        labelKey: 'admin.reviews',
        permission: PERMISSIONS.ProductsWrite,
      },
    ],
  },
  {
    titleKey: 'admin.orders',
    items: [
      { to: '/orders', icon: ShoppingCart, labelKey: 'admin.orders', permission: PERMISSIONS.OrdersRead },
      { to: '/customers', icon: Users, labelKey: 'admin.customers', permission: PERMISSIONS.UsersRead },
    ],
  },
  {
    titleKey: 'admin.campaigns',
    items: [
      { to: '/coupons', icon: BadgePercent, labelKey: 'admin.coupons', permission: PERMISSIONS.CouponsWrite },
      { to: '/campaigns', icon: Sparkles, labelKey: 'admin.campaigns', permission: PERMISSIONS.CampaignsWrite },
    ],
  },
  {
    titleKey: 'admin.settings',
    items: [{ to: '/settings', icon: Settings, labelKey: 'admin.settings' }],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-ink-100 bg-white transition-[width] duration-300',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
        {!collapsed && (
          <span className="font-display text-lg tracking-[0.24em] text-ink-900">VELORA</span>
        )}

        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          aria-label={collapsed ? t('admin.expandMenu') : t('admin.collapseMenu')}
          className="hidden rounded p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900 lg:block"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav aria-label={t('admin.adminMenu')} className="flex-1 overflow-y-auto py-4">
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.titleKey} group={group} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-ink-100 px-4 py-3">
          <p className="text-2xs text-ink-400">{t('common.brand')} Admin · v1.0</p>
        </div>
      )}
    </aside>
  );
}

function NavGroup({
  group,
  collapsed,
  onNavigate,
}: {
  group: { titleKey: string; items: NavItem[] };
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  // Hooks cannot run in a loop, so permission checks live in the leaf component.
  const visibleItems = group.items;

  return (
    <div className="mb-5">
      {!collapsed && (
        <p className="label-caps px-4 pb-2 text-ink-300">{t(group.titleKey)}</p>
      )}

      <ul>
        {visibleItems.map((item) => (
          <NavItemLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </ul>
    </div>
  );
}

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const allowed = useAppSelector(
    item.permission ? selectHasPermission(item.permission) : () => true,
  );

  if (!allowed) return null;

  const Icon = item.icon;

  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        title={collapsed ? t(item.labelKey) : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors',
            collapsed && 'justify-center px-0',
            isActive
              ? 'border-tan-500 bg-tan-100/40 font-medium text-ink-900'
              : 'border-transparent text-ink-500 hover:bg-ink-50 hover:text-ink-900',
          )
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
      </NavLink>
    </li>
  );
}
