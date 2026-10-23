import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type {
  ProduccionLote,
  CreateInspeccionPayload,
  GetFilasInspeccionResponse,
  LineaOperativa,
} from '../types/inspecciones.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export const inspeccionesApi = {
  /**
   * Obtiene la información oficial de un lote maestro por su número.
   */
  getLoteByCodigo: async (codigoLote: string): Promise<ProduccionLote> => {
    const res = await httpClient.get<ApiResponse<ProduccionLote>>(`/lotes/${encodeURIComponent(codigoLote.trim())}`);
    return res.data!;
  },

  /**
   * Crea atómicamente la inspección con todos sus defectos capturados.
   */
  createInspeccion: async (payload: CreateInspeccionPayload): Promise<any> => {
    const res = await httpClient.post<ApiResponse<any>>('/inspecciones', payload);
    return res.data!;
  },

  /**
   * Obtiene el listado de líneas operativas disponibles.
   */
  getLineas: async (): Promise<LineaOperativa[]> => {
    const res = await httpClient.get<ApiResponse<LineaOperativa[]>>('/lineas');
    return res.data || [];
  },

  /**
   * Obtiene los departamentos activos para la selección de departamento auditor o responsable.
   */
  getDepartamentos: async (): Promise<Departamento[]> => {
    const res = await httpClient.get<ApiResponse<Departamento[]>>('/departamentos?activo=true');
    return res.data || [];
  },

  /**
   * Consulta el listado de filas de defectos de inspección del departamento (HOY, ULTIMOS, TODOS).
   */
  getFilasInspeccion: async (params?: {
    periodo?: 'hoy' | 'ultimos' | 'todos';
    busqueda?: string;
    departamentoAuditoriaId?: number;
    mes?: number;
    anio?: number;
    page?: number;
    limit?: number;
  }): Promise<GetFilasInspeccionResponse> => {
    const query = new URLSearchParams();
    if (params?.periodo) query.set('periodo', params.periodo);
    if (params?.busqueda) query.set('busqueda', params.busqueda);
    if (params?.departamentoAuditoriaId) query.set('departamentoAuditoriaId', params.departamentoAuditoriaId.toString());
    if (params?.mes) query.set('mes', params.mes.toString());
    if (params?.anio) query.set('anio', params.anio.toString());
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await httpClient.get<ApiResponse<GetFilasInspeccionResponse>>(
      `/inspecciones${qs}`
    );
    return res.data || { items: [], total: 0, periodo: 'ultimos', page: 1, limit: 30, totalPages: 1 };
  },
};
