import { Navigate, Outlet } from 'react-router';
import { useAuthSession } from '@/providers/auth-provider';
import { PantallaCarga } from '@/components/ui/pantalla-carga';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated, sessionState, isLoading } = useAuthSession();

  if (isLoading || sessionState === 'pending_validation') {
    return <PantallaCarga />;
  }

  if (!isAuthenticated || sessionState === 'revoked' || sessionState === 'unauthenticated') {
    return <Navigate to="/login" replace />;
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
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.rol?.codigo;
  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function RedirectIfAuthenticated({ children }: { children?: ReactNode }) {
  const { isAuthenticated, sessionState, isLoading } = useAuthSession();

  if (isLoading || sessionState === 'pending_validation') {
    return <PantallaCarga />;
  }

  if (isAuthenticated && sessionState !== 'revoked') {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
