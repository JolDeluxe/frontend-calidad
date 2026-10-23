import { useAuthSession } from '@/app/providers/auth-provider';
import type { PermisoCodigo } from '@/config/permissions';

export function usePermissions() {
  const { user } = useAuthSession();

  const permisos = (user as unknown as { permisos?: string[] })?.permisos || [];
  const rol = (typeof user?.rol === 'string' ? user.rol : user?.rol?.codigo || '').toUpperCase();

  const isSuperAdmin = rol === 'SUPER_ADMIN';
  const isAdmin = rol === 'ADMIN' || isSuperAdmin;

  const can = (codigo: PermisoCodigo | string): boolean => {
    if (isSuperAdmin) return true;
    return permisos.includes(codigo);
  };

  const canAny = (...codigos: (PermisoCodigo | string)[]): boolean => {
    if (isSuperAdmin) return true;
    return codigos.some((codigo) => permisos.includes(codigo));
  };

  const canAll = (...codigos: (PermisoCodigo | string)[]): boolean => {
    if (isSuperAdmin) return true;
    return codigos.every((codigo) => permisos.includes(codigo));
  };

  return {
    user,
    rol,
    isSuperAdmin,
    isAdmin,
    permisos,
    can,
    canAny,
    canAll,
    hasPermission: can,
    hasAnyPermission: canAny,
    hasAllPermissions: canAll,
  };
}
