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
   * `idempotencyKey` evita duplicados ante doble envío o reintentos de red.
   */
  createInspeccion: async (payload: CreateInspeccionPayload, idempotencyKey?: string): Promise<any> => {
    const res = await httpClient.post<ApiResponse<any>>('/inspecciones', payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
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
   * Obtiene los inspectores registrados (con rol de inspector/administrador o con inspecciones registradas).
   */
  getInspectores: async (): Promise<Array<{ id: number; nombre: string; usuario: string; rol?: { id: number; codigo: string; nombre: string } }>> => {
    const res = await httpClient.get<ApiResponse<Array<{ id: number; nombre: string; usuario: string; rol?: { id: number; codigo: string; nombre: string } }>>>('/inspecciones/inspectores');
    return res.data || [];
  },

  /**
   * Obtiene las métricas generales del Dashboard de Inicio para todos los usuarios.
   */
  getDashboardMetricas: async (): Promise<{
    contadoresDeptoHoy: Record<number, { pares: number; incidencias: number }>;
    topSemanal: Record<string, Array<{ clave: number; defecto: string; defectos: number }>>;
  }> => {
    const res = await httpClient.get<ApiResponse<{
      contadoresDeptoHoy: Record<number, { pares: number; incidencias: number }>;
      topSemanal: Record<string, Array<{ clave: number; defecto: string; defectos: number }>>;
    }>>('/inspecciones/dashboard-metricas');
    return res.data || { contadoresDeptoHoy: {}, topSemanal: {} };
  },

  /**
   * Consulta el listado de filas de defectos de inspección del departamento (HOY, ULTIMOS, TODOS).
   */
  getFilasInspeccion: async (params?: {
    periodo?: 'hoy' | 'ultimos' | 'todos';
    busqueda?: string;
    departamentoId?: number;
    departamentoAuditoriaId?: number;
    departamentoResponsableId?: number;
    clasificacion?: 'CRITICO' | 'MAYOR' | 'MENOR';
    lineaId?: number;
    lineaTexto?: string;
    inspectorId?: number;
    mes?: number;
    anio?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    soloEliminados?: boolean;
    page?: number;
    limit?: number;
  }): Promise<GetFilasInspeccionResponse> => {
    const query = new URLSearchParams();
    if (params?.periodo) query.set('periodo', params.periodo);
    if (params?.busqueda) query.set('busqueda', params.busqueda);
    if (params?.departamentoId) query.set('departamentoId', params.departamentoId.toString());
    if (params?.departamentoAuditoriaId) query.set('departamentoAuditoriaId', params.departamentoAuditoriaId.toString());
    if (params?.departamentoResponsableId) query.set('departamentoResponsableId', params.departamentoResponsableId.toString());
    if (params?.clasificacion) query.set('clasificacion', params.clasificacion);
    if (params?.lineaId) query.set('lineaId', params.lineaId.toString());
    if (params?.lineaTexto) query.set('lineaTexto', params.lineaTexto);
    if (params?.inspectorId) query.set('inspectorId', params.inspectorId.toString());
    if (params?.mes) query.set('mes', params.mes.toString());
    if (params?.anio) query.set('anio', params.anio.toString());
    if (params?.fechaDesde) query.set('fechaDesde', params.fechaDesde);
    if (params?.fechaHasta) query.set('fechaHasta', params.fechaHasta);
    if (params?.soloEliminados !== undefined) query.set('soloEliminados', String(params.soloEliminados));
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await httpClient.get<ApiResponse<GetFilasInspeccionResponse>>(
      `/inspecciones${qs}`
    );
    return res.data || { items: [], total: 0, periodo: 'ultimos', page: 1, limit: 30, totalPages: 1 };
  },

  /**
   * Elimina un detalle de defecto (solo permitido dentro de los últimos 30 días).
   */
  cancelarDetalleInspeccion: async (
    detalleId: number,
    payload?: { motivo?: string; codigoConfirmacion?: string }
  ): Promise<any> => {
    const res = await httpClient.post<ApiResponse<any>>(`/inspecciones/detalles/${detalleId}/cancelar`, payload || {});
    return res.data;
  },

  /**
   * Recupera un detalle de defecto eliminado lógicamente.
   */
  recuperarDetalleInspeccion: async (
    detalleId: number,
    payload?: { motivo?: string }
  ): Promise<any> => {
    const res = await httpClient.post<ApiResponse<any>>(`/inspecciones/detalles/${detalleId}/recuperar`, payload || {});
    return res.data;
  },
};
