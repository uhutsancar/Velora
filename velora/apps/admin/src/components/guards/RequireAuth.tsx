import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Box } from '@mui/material';
import type { PermissionCode } from '@velora/shared';
import { LoadingScreen } from '@/components/ui/Feedback';
import { useAppSelector } from '@/store/hooks';
import {
  selectAuthInitialized,
  selectHasPermission,
  selectIsAuthenticated,
} from '@/store/slices/authSlice';

/**
 * Route guard.
 *
 * This is convenience, not security: the API enforces the same policies, so a
 * user who bypasses the guard still gets 403 from every protected endpoint.
 */
export function RequireAuth({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: PermissionCode;
}) {
  const location = useLocation();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const initialized = useAppSelector(selectAuthInitialized);
  const allowed = useAppSelector(permission ? selectHasPermission(permission) : () => true);

  if (!initialized && !isAuthenticated) {
    return <LoadingScreen height="100dvh" />;
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (!allowed) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Bu bölüme erişim yetkiniz yok. Gerekirse yöneticinizden <strong>{permission}</strong> iznini
          talep edin.
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}

/** Shorthand used by the route table: a RequireAuth scoped to one permission. */
export function Guarded({
  permission,
  children,
}: {
  permission: PermissionCode;
  children: ReactNode;
}) {
  return <RequireAuth permission={permission}>{children}</RequireAuth>;
}
