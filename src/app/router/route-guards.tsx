import { Navigate, Outlet } from 'react-router';
import { useAuthSession } from '@/providers/auth-provider';
import { Spinner } from '@/components/ui/spinner';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated, sessionState, isLoading } = useAuthSession();

  if (isLoading || sessionState === 'pending_validation') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cuadra-arena">
        <Spinner size="36px" />
      </div>
    );
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-cuadra-arena">
        <Spinner size="36px" />
      </div>
    );
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-cuadra-arena">
        <Spinner size="36px" />
      </div>
    );
  }

  if (isAuthenticated && sessionState !== 'revoked') {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
