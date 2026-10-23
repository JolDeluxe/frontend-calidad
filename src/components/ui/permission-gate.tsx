import { type ReactNode } from 'react';
import { usePermissions } from '@/shared/hooks/use-permissions';
import type { PermisoCodigo } from '@/config/permissions';

export interface PermissionGateProps {
  /** Permiso individual obligatorio */
  permission?: PermisoCodigo | string;
  /** Al menos uno de estos permisos debe estar presente */
  anyPermission?: (PermisoCodigo | string)[];
  /** Todos estos permisos deben estar presentes */
  allPermissions?: (PermisoCodigo | string)[];
  /** Contenido protegido a renderizar si se cumple la condición */
  children: ReactNode;
  /** Contenido alternativo si no se cumple (por defecto null) */
  fallback?: ReactNode;
}

/**
 * Componente declarativo para control de visualización basado en permisos efectivos (SKILL.md §13).
 *
 * Si el usuario posee los permisos requeridos (o es SUPER_ADMIN), renderiza `children`.
 * En caso contrario renderiza `fallback` (o nada).
 */
export function PermissionGate({
  permission,
  anyPermission,
  allPermissions,
  children,
  fallback = null,
}: PermissionGateProps): ReactNode {
  const { can, canAny, canAll } = usePermissions();

  let isAllowed = true;

  if (permission && !can(permission)) {
    isAllowed = false;
  }

  if (isAllowed && anyPermission && anyPermission.length > 0 && !canAny(...anyPermission)) {
    isAllowed = false;
  }

  if (isAllowed && allPermissions && allPermissions.length > 0 && !canAll(...allPermissions)) {
    isAllowed = false;
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
