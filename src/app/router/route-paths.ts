/**
 * Catálogo tipado de paths de ruta de la aplicación.
 * Centraliza todas las rutas eliminando strings mágicos dispersos.
 */
export const ROUTES = {
  /** Raíz de la aplicación */
  ROOT: '/',

  /** Pantalla de inicio de sesión */
  LOGIN: '/login',

  /** Panel de control principal */
  DASHBOARD: '/',

  /** Módulo Principal Sistema / Auditoría (Base) */
  SISTEMA: '/sistema',

  /** Submódulo: Eventos de Auditoría Funcional (Página principal siempre visible) */
  AUDITORIA_EVENTOS: '/sistema/auditoria',

  /** Submódulo: Logs Técnicos Estructurados (Pino JSON) */
  AUDITORIA_LOGS: '/sistema/logs',

  /** Submódulo: Consola PM2 en Vivo */
  AUDITORIA_CONSOLA: '/sistema/consola',

  /** Catálogos Administrativos */
  DEPARTAMENTOS: '/departamentos',
  DEFECTOS: '/defectos',

  /** Módulo Operativo de Inspección de Defectos */
  INSPECCIONES: '/inspecciones',
  INSPECCION_CAPTURA: '/inspecciones/captura',

  // Alias de compatibilidad para evitar roturas
  AUDITORIA: '/sistema/auditoria',
  LOGS: '/sistema/logs',
  MONITOR: '/sistema/auditoria',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
