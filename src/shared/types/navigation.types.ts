/**
 * Tipos para la navegación lateral del dashboard.
 * Se definen aquí para que layouts y config/navigation.ts los compartan.
 */

export interface NavChild {
  id: string;
  /** Nombre visible del elemento de navegación */
  name: string;
  /** Ruta de React Router */
  route: string;
}

export interface NavItem {
  id: string;
  /** Nombre visible del módulo */
  name: string;
  /** Nombre del icono Material Symbols */
  icon: string;
  /** Ruta principal del módulo */
  route: string;
  /** Sub-ítems (opcional, para menús anidados) */
  children?: NavChild[];
  /** Permiso requerido para visualizar este ítem */
  permission?: string;
  /** Roles permitidos para visualizar este ítem */
  allowedRoles?: string[];
  /** Separador visual antes de este ítem */
  divider?: boolean;
  /** Si true, este elemento es solo un separador visual */
  isDivider?: boolean;
}
