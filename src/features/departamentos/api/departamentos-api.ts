import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type { TipoOperacion, Linea, Departamento } from '../types/departamentos.types';

export const departamentosApi = {
  // Tipos de Operación
  getTiposOperacion: async (incluirInactivos = false) => {
    const params = incluirInactivos ? '?incluirInactivos=true' : '';
    const res = await httpClient.get<ApiResponse<TipoOperacion[]>>(`/tipos-operacion${params}`);
    return res.data || [];
  },

  createTipoOperacion: async (data: { codigo: string; nombre: string; descripcion?: string | null }) => {
    const res = await httpClient.post<ApiResponse<TipoOperacion>>('/tipos-operacion', data);
    return res.data!;
  },

  updateTipoOperacion: async (id: number, data: { nombre?: string; descripcion?: string | null; estado?: 'ACTIVO' | 'INACTIVO' }) => {
    const res = await httpClient.patch<ApiResponse<TipoOperacion>>(`/tipos-operacion/${id}`, data);
    return res.data!;
  },

  updateEstadoTipoOperacion: async (id: number, estado: 'ACTIVO' | 'INACTIVO') => {
    const res = await httpClient.patch<ApiResponse<TipoOperacion>>(`/tipos-operacion/${id}/estado`, { estado });
    return res.data!;
  },

  deleteTipoOperacion: async (id: number) => {
    const res = await httpClient.delete<ApiResponse<{ id: number; eliminado: boolean }>>(`/tipos-operacion/${id}`);
    return res.data!;
  },

  // Líneas
  getLineas: async (tipoOperacionId?: number, incluirInactivas = false) => {
    const query = new URLSearchParams();
    if (tipoOperacionId) query.set('tipoOperacionId', tipoOperacionId.toString());
    if (incluirInactivas) query.set('incluirInactivas', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await httpClient.get<ApiResponse<Linea[]>>(`/lineas${qs}`);
    return res.data || [];
  },

  createLinea: async (data: { tipoOperacionId: number; codigo: string; nombre: string; descripcion?: string | null }) => {
    const res = await httpClient.post<ApiResponse<Linea>>('/lineas', data);
    return res.data!;
  },

  updateLinea: async (id: number, data: { nombre?: string; descripcion?: string | null; estado?: 'ACTIVO' | 'INACTIVO' }) => {
    const res = await httpClient.patch<ApiResponse<Linea>>(`/lineas/${id}`, data);
    return res.data!;
  },

  updateEstadoLinea: async (id: number, estado: 'ACTIVO' | 'INACTIVO') => {
    const res = await httpClient.patch<ApiResponse<Linea>>(`/lineas/${id}/estado`, { estado });
    return res.data!;
  },

  deleteLinea: async (id: number) => {
    const res = await httpClient.delete<ApiResponse<{ id: number; eliminado: boolean }>>(`/lineas/${id}`);
    return res.data!;
  },

  syncLineaDepartamentos: async (
    lineaId: number,
    departamentos: Array<{ departamentoId: number; activo: boolean; orden?: number }>
  ) => {
    const res = await httpClient.put<ApiResponse<unknown[]>>(`/lineas/${lineaId}/departamentos`, { departamentos });
    return res.data || [];
  },

  // Departamentos
  getDepartamentos: async (params?: {
    lineaId?: number;
    tipoOperacionId?: number;
    categoriaDepartamentoId?: number;
    estado?: string;
    busqueda?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.lineaId) query.set('lineaId', params.lineaId.toString());
    if (params?.tipoOperacionId) query.set('tipoOperacionId', params.tipoOperacionId.toString());
    if (params?.categoriaDepartamentoId) query.set('categoriaDepartamentoId', params.categoriaDepartamentoId.toString());
    if (params?.estado) query.set('estado', params.estado);
    if (params?.busqueda) query.set('busqueda', params.busqueda);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await httpClient.get<ApiResponse<Departamento[]>>(`/departamentos${qs}`);
    return res.data || [];
  },

  getDepartamentoById: async (id: number) => {
    const res = await httpClient.get<ApiResponse<Departamento>>(`/departamentos/${id}`);
    return res.data!;
  },

  createDepartamento: async (data: {
    codigo: string;
    nombre: string;
    categoriaDepartamentoId?: number | null;
    lineasIds?: number[];
  }) => {
    const res = await httpClient.post<ApiResponse<Departamento>>('/departamentos', data);
    return res.data!;
  },

  updateDepartamento: async (
    id: number,
    data: {
      nombre?: string;
      codigo?: string;
      categoriaDepartamentoId?: number | null;
      lineasIds?: number[];
    }
  ) => {
    const res = await httpClient.patch<ApiResponse<Departamento>>(`/departamentos/${id}`, data);
    return res.data!;
  },

  updateEstadoDepartamento: async (id: number, estado: 'ACTIVO' | 'INACTIVO') => {
    const res = await httpClient.patch<ApiResponse<Departamento>>(`/departamentos/${id}/estado`, { estado });
    return res.data!;
  },

  deleteDepartamento: async (id: number) => {
    const res = await httpClient.delete<ApiResponse<{ id: number; eliminado: boolean }>>(`/departamentos/${id}`);
    return res.data!;
  },
};
