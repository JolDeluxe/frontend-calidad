import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type { TerminalEstadoResponse, TerminalPublicInfo } from '../services/terminal-storage';

export interface TerminalGestionItem {
  id: number;
  nombre: string;
  departamentoId: number;
  departamento: {
    id: number;
    codigo: string;
    nombre: string;
  };
  estado: string;
  motivoBloqueo?: string | null;
  fechaCreacion: string;
  fechaRevocacion?: string | null;
  fechaUltimoAcceso?: string | null;
}

export interface CanjearRecuperacionResult {
  credencial: string;
  terminal: TerminalPublicInfo;
}

export interface SolicitarRecuperacionResult {
  codigo: string;
  expiraEn: string;
  terminalId: number;
  terminalNombre: string;
}

export const terminalesApi = {
  /**
   * Consulta el estado de vinculación física del navegador actual (/estado).
   */
  consultarEstado: async (): Promise<TerminalEstadoResponse> => {
    const res = await httpClient.get<ApiResponse<TerminalEstadoResponse>>('/terminales/estado');
    return res.data || { vinculada: false };
  },

  /**
   * Canje presencial de código OTP de 6 dígitos desde la estación de trabajo física.
   */
  canjearRecuperacion: async (codigo: string): Promise<CanjearRecuperacionResult> => {
    const res = await httpClient.post<ApiResponse<CanjearRecuperacionResult>>(
      '/terminales/canjear-recuperacion',
      { codigo },
    );
    if (!res.data) throw new Error('Respuesta inválida del servidor al canjear código');
    return res.data;
  },

  /**
   * Listado de terminales registradas (SUPER_ADMIN).
   */
  getTerminales: async (): Promise<TerminalGestionItem[]> => {
    const res = await httpClient.get<ApiResponse<TerminalGestionItem[]>>('/terminales');
    return res.data || [];
  },

  /**
   * Generar código de recuperación OTP de 6 dígitos para una terminal (SUPER_ADMIN).
   */
  solicitarRecuperacion: async (terminalId: number): Promise<SolicitarRecuperacionResult> => {
    const res = await httpClient.post<ApiResponse<SolicitarRecuperacionResult>>(
      `/terminales/${terminalId}/solicitar-recuperacion`,
    );
    if (!res.data) throw new Error('Respuesta inválida al solicitar código de recuperación');
    return res.data;
  },

  /**
   * Reasignar departamento de una terminal (SUPER_ADMIN).
   */
  reasignarDepartamento: async (
    terminalId: number,
    data: { departamentoId: number; motivo?: string },
  ): Promise<TerminalGestionItem> => {
    const res = await httpClient.patch<ApiResponse<TerminalGestionItem>>(
      `/terminales/${terminalId}/departamento`,
      data,
    );
    if (!res.data) throw new Error('Respuesta inválida al reasignar departamento');
    return res.data;
  },

  /**
   * Revocar / bloquear una terminal física (SUPER_ADMIN).
   */
  revocarTerminal: async (terminalId: number, motivo?: string): Promise<TerminalGestionItem> => {
    const res = await httpClient.post<ApiResponse<TerminalGestionItem>>(
      `/terminales/${terminalId}/revocar`,
      { motivo },
    );
    if (!res.data) throw new Error('Respuesta inválida al revocar terminal');
    return res.data;
  },

  /**
   * Sugerir nombre secuencial automático para terminal según departamento.
   */
  sugerirNombre: async (departamentoId: number): Promise<string> => {
    const res = await httpClient.get<ApiResponse<{ nombre: string }>>(
      `/terminales/sugerir-nombre?departamentoId=${departamentoId}`,
    );
    return res.data?.nombre || '';
  },

  /**
   * Alta inicial de una terminal (SUPER_ADMIN).
   */
  crearTerminal: async (data: {
    nombre?: string;
    departamentoId: number;
  }): Promise<{ terminal: TerminalPublicInfo; credencial: string }> => {
    const res = await httpClient.post<
      ApiResponse<{ terminal: TerminalPublicInfo; credencial: string }>
    >('/terminales', data);
    if (!res.data) throw new Error('Respuesta inválida al crear terminal');
    return res.data;
  },
};
