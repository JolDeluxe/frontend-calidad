export interface NavItem {
  id: string;
  name: string;
  icon: string;
  route: string;
  allowedRoles?: string[];
  isDivider?: boolean;
}

export const NAVIGATION_CONFIG: NavItem[] = [
  {
    id: 'inicio',
    name: 'Inicio',
    icon: 'home',
    route: '/',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'USUARIO', 'INSPECTOR', 'COORD'],
  },
  {
    id: 'inspecciones',
    name: 'Captura',
    icon: 'assignment_turned_in',
    route: '/inspecciones',
    allowedRoles: ['SUPER_ADMIN', 'INSPECTOR'],
  },
  {
    id: 'departamentos',
    name: 'Departamentos y Operación',
    icon: 'domain',
    route: '/departamentos',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'defectos',
    name: 'Defectos',
    icon: 'bug_report',
    route: '/defectos',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'usuarios',
    name: 'Usuarios',
    icon: 'group',
    route: '/usuarios',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'sistema',
    name: 'Sistema y Auditoría',
    icon: 'history',
    route: '/sistema/auditoria',
    allowedRoles: ['SUPER_ADMIN'],
  },
];

export function getNavigationByRole(rolCodigo?: string): NavItem[] {
  if (!rolCodigo) return [];
  return NAVIGATION_CONFIG.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(rolCodigo);
  });
}

export function getRouteTitle(pathname: string): string {
  if (pathname === '/') return 'Inicio';
  if (pathname.startsWith('/inspecciones')) return 'Captura de Defectos';
  if (pathname.startsWith('/departamentos')) return 'Catálogo de Departamentos';
  if (pathname.startsWith('/defectos')) return 'Catálogo de Defectos';
  if (pathname.startsWith('/usuarios')) return 'Gestión de Usuarios';
  if (pathname.startsWith('/sistema')) {
    if (pathname.includes('/auditoria')) return 'Auditoría Funcional';
    if (pathname.includes('/logs')) return 'Logs Técnicos';
    if (pathname.includes('/consola')) return 'Consola PM2';
    return 'Sistema y Auditoría';
  }
  if (pathname.startsWith('/admin')) {
    if (pathname.includes('/auditoria')) return 'Auditoría Funcional';
    if (pathname.includes('/logs')) return 'Logs Técnicos';
    return 'Panel de Administración';
  }
  return 'Sistema de Calidad MBC';
}
