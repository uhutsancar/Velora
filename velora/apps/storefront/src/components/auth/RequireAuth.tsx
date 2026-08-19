import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/Feedback';
import { useAppSelector } from '@/store/hooks';
import { selectAuthInitialized, selectIsAuthenticated } from '@/store/slices/authSlice';

/**
 * Client-side route guard.
 *
 * This is a UX affordance only — every protected endpoint is also authorised on
 * the server, so bypassing this component gains an attacker nothing.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const initialized = useAppSelector(selectAuthInitialized);

  // Wait for the persisted session to be validated before deciding.
  if (!initialized && !isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/giris?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
