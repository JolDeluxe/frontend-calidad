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
      window.dispatchEvent(new CustomEvent('terminal:changed', { detail: { credencial: null } }));
    } catch {
      // Ignorar errores
    }
  },
};
