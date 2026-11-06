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
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'COORD'],
  },
  {
    id: 'inspecciones',
    name: 'Captura',
    icon: 'assignment_add',
    route: '/inspecciones',
    allowedRoles: ['SUPER_ADMIN', 'INSPECTOR', 'VISUALIZADOR'],
  },
  {
    id: 'registro',
    name: 'Registro',
    icon: 'list_alt',
    route: '/registro',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'COORD', 'VISUALIZADOR'],
  },
  {
    id: 'defectos',
    name: 'Defectos',
    icon: 'deployed_code_alert',
    route: '/defectos',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'VISUALIZADOR'],
  },
  {
    id: 'departamentos',
    name: 'Departamentos',
    icon: 'domain',
    route: '/departamentos',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'VISUALIZADOR'],
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
    name: 'Configuración',
    icon: 'settings',
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
  if (pathname.startsWith('/registro')) return 'Registro Histórico de Defectos';
  if (pathname.startsWith('/departamentos')) return 'Catálogo de Departamentos';
  if (pathname.startsWith('/defectos')) return 'Catálogo de Defectos';
  if (pathname.startsWith('/usuarios')) return 'Gestión de Usuarios';
  if (pathname.startsWith('/sistema')) {
    if (pathname.includes('/auditoria')) return 'Auditoría Funcional';
    if (pathname.includes('/logs')) return 'Logs Técnicos';
    if (pathname.includes('/consola')) return 'Consola PM2';
    if (pathname.includes('/terminales')) return 'Terminales Físicas';
    if (pathname.includes('/matriz-visibilidad')) return 'Matriz Maestra de Visibilidad';
    return 'Sistema y Auditoría';
  }
  if (pathname.startsWith('/admin')) {
    if (pathname.includes('/auditoria')) return 'Auditoría Funcional';
    if (pathname.includes('/logs')) return 'Logs Técnicos';
    return 'Panel de Administración';
  }
  return 'Sistema de Calidad MBC';
}
