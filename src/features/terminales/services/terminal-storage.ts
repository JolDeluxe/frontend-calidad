import {
  idbDatabase,
  type TerminalProfileStore,
  type ColaInspeccionStore,
} from '@/lib/db/idb-database';

/**
 * Clave estandarizada en localStorage para la credencial física de terminal.
 */
export const TERMINAL_STORAGE_KEY = 'mbc_terminal_credential';

export interface TerminalPublicInfo {
  id: number;
  nombre: string;
  departamentoId: number;
  departamentoNombre: string;
  departamentoCodigo: string;
  numeroLineas?: number;
  estado: string;
}

export interface TerminalEstadoResponse {
  vinculada: boolean;
  terminal?: TerminalPublicInfo;
}

export const terminalStorage = {
  getCredential: (): string | null => {
    try {
      return localStorage.getItem(TERMINAL_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  setCredential: (credencial: string): void => {
    try {
      localStorage.setItem(TERMINAL_STORAGE_KEY, credencial.trim());
      window.dispatchEvent(new CustomEvent('terminal:changed', { detail: { credencial } }));
    } catch {
      // Ignorar errores en entornos sin localStorage
    }
  },
  removeCredential: (): void => {
    try {
      localStorage.removeItem(TERMINAL_STORAGE_KEY);
      // Limpiar también perfil provisional de terminal en IndexedDB
      void idbDatabase.delete('terminal_profile', 'local');
      window.dispatchEvent(new CustomEvent('terminal:changed', { detail: { credencial: null } }));
    } catch {
      // Ignorar errores
    }
  },
  saveProfileToIdb: async (terminal: TerminalPublicInfo): Promise<void> => {
    if (!idbDatabase.getAvailable()) return;
    const profile: TerminalProfileStore = {
      id: 'local',
      terminalId: terminal.id,
      nombre: terminal.nombre,
      departamentoId: terminal.departamentoId,
      departamentoCodigo: terminal.departamentoCodigo,
      departamentoNombre: terminal.departamentoNombre,
      numeroLineas: terminal.numeroLineas ?? (terminal.departamentoCodigo === 'MONTADO' ? 2 : 1),
      guardadoEn: new Date().toISOString(),
    };
    await idbDatabase.put('terminal_profile', profile);
  },
  getProfileFromIdb: async (): Promise<TerminalProfileStore | null> => {
    if (!idbDatabase.getAvailable()) return null;
    return idbDatabase.get<TerminalProfileStore>('terminal_profile', 'local');
  },
  /**
   * Obtiene el resumen de registros pendientes o en proceso en la cola local de inspecciones.
   */
  getPendingQueueSummary: async (): Promise<{
    total: number;
    pendientes: number;
    sincronizando: number;
    erroresReintentables: number;
  }> => {
    if (!idbDatabase.getAvailable()) {
      return { total: 0, pendientes: 0, sincronizando: 0, erroresReintentables: 0 };
    }
    try {
      const items = await idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones');
      const pendientes = items.filter((i) => i.estado === 'PENDIENTE').length;
      const sincronizando = items.filter((i) => i.estado === 'SINCRONIZANDO').length;
      const erroresReintentables = items.filter((i) => i.estado === 'ERROR_REINTENTABLE').length;
      return {
        total: pendientes + sincronizando + erroresReintentables,
        pendientes,
        sincronizando,
        erroresReintentables,
      };
    } catch {
      return { total: 0, pendientes: 0, sincronizando: 0, erroresReintentables: 0 };
    }
  },
  /**
   * Indica si la estación tiene inspecciones pendientes en cola local que requieren protección.
   */
  hasPendingQueue: async (): Promise<boolean> => {
    const summary = await terminalStorage.getPendingQueueSummary();
    return summary.total > 0;
  },
  /**
   * Valida si es seguro desvincular la estación sin riesgo de pérdida de datos.
   */
  canSafelyUnlink: async (): Promise<{
    puede: boolean;
    motivo?: string;
    pendientes: number;
  }> => {
    const summary = await terminalStorage.getPendingQueueSummary();
    if (summary.total > 0) {
      return {
        puede: false,
        motivo: `No se puede desvincular: existen ${summary.total} inspección(es) pendiente(s) en la cola local. Exporte un respaldo .mbcbak o complete la sincronización.`,
        pendientes: summary.total,
      };
    }
    return { puede: true, pendientes: 0 };
  },
};

