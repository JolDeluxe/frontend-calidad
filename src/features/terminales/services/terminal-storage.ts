import { idbDatabase, type TerminalProfileStore } from '@/lib/db/idb-database';

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
};

