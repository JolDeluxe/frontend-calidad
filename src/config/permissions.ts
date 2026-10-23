/**
 * Catálogo canónico de permisos del frontend.
 * Reflejo exacto del backend (backend/src/config/permissions.ts).
 * Fuente de verdad única para capacidades en la interfaz.
 */

export const PERMISOS = {
  // ── Listados de material ──────────────────────────────────────────────
  LISTADO_VER: 'listado:ver',
  LISTADO_CREAR: 'listado:crear',
  LISTADO_EDITAR: 'listado:editar',
  LISTADO_SEPARAR: 'listado:separar',
  LISTADO_ENTREGAR: 'listado:entregar',
  LISTADO_RETROCEDER: 'listado:retroceder',
  LISTADO_CANCELAR: 'listado:cancelar',
  LISTADO_DESCONTAR: 'listado:descontar',

  // ── Usuarios ──────────────────────────────────────────────────────────
  USUARIO_VER: 'usuario:ver',
  USUARIO_CREAR: 'usuario:crear',
  USUARIO_EDITAR: 'usuario:editar',
  USUARIO_ELIMINAR: 'usuario:eliminar',
  USUARIO_PASSWORD_VER: 'usuario:password:ver',

  // ── Departamentos y líneas de producción ──────────────────────────────
  DEPARTAMENTO_VER: 'departamento:ver',
  DEPARTAMENTO_ADMINISTRAR: 'departamento:administrar',

  // ── Roles ─────────────────────────────────────────────────────────────
  ROL_VER: 'rol:ver',

  // ── Permisos ──────────────────────────────────────────────────────────
  PERMISO_VER: 'permiso:ver',
  PERMISO_ADMINISTRAR: 'permiso:administrar',

  // ── Registro del sistema (Bitácora de auditoría) ──────────────────────
  REGISTRO_SISTEMA_VER: 'registro_sistema:ver',
} as const;

export type PermisoCodigo = (typeof PERMISOS)[keyof typeof PERMISOS];
