import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type { TerminalEstadoResponse, TerminalPublicInfo } from '../services/terminal-storage';
import type { TerminalDepartamentoProfileItem } from '@/lib/db/idb-database';

export interface TerminalGestionItem {
  id: number;
  nombre: string;
  departamentoId: number;
  departamento: {
    id: number;
    codigo: string;
    nombre: string;
  };
  departamentosActivos?: TerminalDepartamentoProfileItem[];
  departamentosIds?: number[];
  lugarDeteccion?: string;
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

export interface SuperAdminItem {
  id: number;
  nombre: string;
  usuario: string;
}

export interface VerificarAutorizacionSuperAdminParams {
  superAdminId: number;
  password: string;
  accion: string;
  motivo?: string;
  terminalId?: number;
}

export interface VerificarAutorizacionSuperAdminResult {
  autorizado: boolean;
  fechaAutorizacion: string;
  autorizador: {
    id: number;
    nombre: string;
    usuario: string;
  };
  accion: string;
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
   * Cambiar nombre visible personalizado de una terminal (SUPER_ADMIN).
   */
  renombrarTerminal: async (
    terminalId: number,
    data: { nombre: string; motivo?: string },
  ): Promise<TerminalGestionItem> => {
    const res = await httpClient.patch<ApiResponse<TerminalGestionItem>>(
      `/terminales/${terminalId}/nombre`,
      data,
    );
    if (!res.data) throw new Error('Respuesta inválida al renombrar terminal');
    return res.data;
  },

  /**
   * Actualizar departamentos asociados y departamento principal de una terminal (SUPER_ADMIN).
   */
  actualizarDepartamentosTerminal: async (
    terminalId: number,
    data: {
      departamentosIds: number[];
      departamentoPrincipalId: number;
      motivo?: string;
    },
  ): Promise<TerminalGestionItem> => {
    const res = await httpClient.put<ApiResponse<TerminalGestionItem>>(
      `/terminales/${terminalId}/departamentos`,
      data,
    );
    if (!res.data) throw new Error('Respuesta inválida al actualizar departamentos de la terminal');
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
    departamentosIds?: number[];
  }): Promise<{ terminal: TerminalPublicInfo; credencial: string }> => {
    const res = await httpClient.post<
      ApiResponse<{ terminal: TerminalPublicInfo; credencial: string }>
    >('/terminales', data);
    if (!res.data) throw new Error('Respuesta inválida al crear terminal');
    return res.data;
  },

  /**
   * Obtiene la lista de usuarios con rol SUPER_ADMIN activos para autorizaciones presenciales.
   */
  getSuperAdmins: async (): Promise<SuperAdminItem[]> => {
    const res = await httpClient.get<ApiResponse<SuperAdminItem[]>>('/terminales/superadmins');
    return res.data || [];
  },

  /**
   * Verifica la contraseña de un Super Administrador para autorizar contingencias o desvinculación.
   */
  verificarAutorizacionSuperAdmin: async (
    params: VerificarAutorizacionSuperAdminParams,
  ): Promise<VerificarAutorizacionSuperAdminResult> => {
    const res = await httpClient.post<ApiResponse<VerificarAutorizacionSuperAdminResult>>(
      '/terminales/verificar-autorizacion-superadmin',
      params,
    );
    if (!res.data) throw new Error('Respuesta inválida al verificar autorización de SuperAdmin');
    return res.data;
  },
};
