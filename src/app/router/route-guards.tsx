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

/**
 * Determina el destino por defecto según el rol del usuario.
 * Si el usuario NO es SUPER_ADMIN, no tiene permitido acceder a ROOT ('/'),
 * dirigiéndose a su módulo operativo principal (INSPECCIONES o REGISTRO).
 */
export function getDefaultRouteForUser(rolCodigo?: string): string {
  const rol = rolCodigo?.toUpperCase();
  if (rol === 'SUPER_ADMIN') {
    return ROUTES.ROOT;
  }
  if (rol === 'INSPECTOR') {
    return ROUTES.INSPECCIONES;
  }
  if (rol === 'COORD' || rol === 'ADMIN' || rol === 'VISUALIZADOR') {
    return ROUTES.REGISTRO;
  }
  return ROUTES.INSPECCIONES;
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
    const destinoFallback = getDefaultRouteForUser(userRole);
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
    const destino = getDefaultRouteForUser(user?.rol?.codigo);
    return <Navigate to={destino} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
