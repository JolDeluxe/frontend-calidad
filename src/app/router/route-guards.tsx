import { Navigate, Outlet } from 'react-router';
import { useAuthSession } from '@/providers/auth-provider';
import { PantallaCarga } from '@/components/ui/pantalla-carga';
import { ROUTES } from './route-paths';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated, sessionState, isLoading } = useAuthSession();

  if (isLoading || sessionState === 'pending_validation') {
    return <PantallaCarga />;
  }

  if (!isAuthenticated || sessionState === 'revoked' || sessionState === 'unauthenticated') {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children?: ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuthSession();

  if (isLoading) {
    return <PantallaCarga />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const userRole = user?.rol?.codigo;
  if (!userRole || !roles.includes(userRole)) {
    const destinoFallback = userRole?.toUpperCase() === 'INSPECTOR' ? ROUTES.INSPECCIONES : ROUTES.ROOT;
    return <Navigate to={destinoFallback} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function RedirectIfAuthenticated({ children }: { children?: ReactNode }) {
  const { user, isAuthenticated, sessionState, isLoading } = useAuthSession();

  if (isLoading || sessionState === 'pending_validation') {
    return <PantallaCarga />;
  }

  if (isAuthenticated && sessionState !== 'revoked') {
    const esInspector = user?.rol?.codigo?.toUpperCase() === 'INSPECTOR';
    const destino = esInspector ? ROUTES.INSPECCIONES : ROUTES.ROOT;
    return <Navigate to={destino} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
