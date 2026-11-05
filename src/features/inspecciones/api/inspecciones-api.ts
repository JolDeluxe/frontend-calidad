import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type {
  ProduccionLote,
  CreateInspeccionPayload,
  GetFilasInspeccionResponse,
  ExportarFilasInspeccionResponse,
  PeriodosDisponiblesResponse,
  InspectorActivoItem,
  DefectoCatalogoFiltroItem,
  FiltrosInspeccionesQueryParams,
  GetFilasInspeccionQueryParams,
  GetPeriodosDisponiblesQueryParams,
  LineaOperativa,
} from '../types/inspecciones.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

function construirQueryStringInspecciones(params?: GetFilasInspeccionQueryParams): string {
  const query = new URLSearchParams();
  if (!params) return '';

  if (params.periodo) query.set('periodo', params.periodo);
  if (params.dia) query.set('dia', params.dia);
  if (params.semana !== undefined) query.set('semana', params.semana.toString());
  if (params.anioIso !== undefined) query.set('anioIso', params.anioIso.toString());
  if (params.mes !== undefined) query.set('mes', params.mes.toString());
  if (params.anio !== undefined) query.set('anio', params.anio.toString());
  if (params.fechaDesde) query.set('fechaDesde', params.fechaDesde);
  if (params.fechaHasta) query.set('fechaHasta', params.fechaHasta);
  if (params.busqueda) query.set('busqueda', params.busqueda);
  if (params.lote) query.set('lote', params.lote);
  if (params.defectoClave !== undefined) query.set('defectoClave', params.defectoClave.toString());
  if (params.departamentoId) query.set('departamentoId', params.departamentoId.toString());
  if (params.departamentoAuditoriaId) {
    query.set('departamentoAuditoriaId', params.departamentoAuditoriaId.toString());
  }
  if (params.departamentoResponsableId) {
    query.set('departamentoResponsableId', params.departamentoResponsableId.toString());
  }
  if (params.clasificacion) query.set('clasificacion', params.clasificacion);
  if (params.lineaId) query.set('lineaId', params.lineaId.toString());
  if (params.lineaTexto) query.set('lineaTexto', params.lineaTexto);
  if (params.inspectorId) query.set('inspectorId', params.inspectorId.toString());
  if (params.terminalId) query.set('terminalId', params.terminalId.toString());
  if (params.soloEliminados !== undefined) {
    query.set('soloEliminados', String(params.soloEliminados));
  }
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const inspeccionesApi = {
  /**
   * Obtiene la información oficial de un lote maestro por su número.
   */
  getLoteByCodigo: async (codigoLote: string): Promise<ProduccionLote> => {
    const res = await httpClient.get<ApiResponse<ProduccionLote>>(
      `/lotes/${encodeURIComponent(codigoLote.trim())}`,
    );
    return res.data!;
  },

  /**
   * Crea atómicamente la inspección con todos sus defectos capturados.
   * `idempotencyKey` evita duplicados ante doble envío o reintentos de red.
   */
  createInspeccion: async (
    payload: CreateInspeccionPayload,
    idempotencyKey?: string,
  ): Promise<any> => {
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
   * Obtiene exclusivamente los inspectores activos (rol INSPECTOR y estado ACTIVO)
   * dentro del alcance departamental autorizado.
   */
  getInspectores: async (params?: {
    departamentoId?: number;
  }): Promise<InspectorActivoItem[]> => {
    const qs = params?.departamentoId ? `?departamentoId=${params.departamentoId}` : '';
    const res = await httpClient.get<ApiResponse<InspectorActivoItem[]>>(
      `/inspecciones/inspectores${qs}`,
    );
    return res.data || [];
  },

  /**
   * Obtiene el catálogo de defectos activos para el selector de filtro por defecto.
   */
  getDefectosCatalogo: async (params?: {
    departamentoId?: number;
  }): Promise<DefectoCatalogoFiltroItem[]> => {
    const query = new URLSearchParams({ activo: 'true', limit: '500' });
    if (params?.departamentoId) {
      query.set('departamentoId', params.departamentoId.toString());
    }
    const res = await httpClient.get<
      ApiResponse<{ items: DefectoCatalogoFiltroItem[]; total: number }>
    >(`/defectos?${query.toString()}`);
    return res.data?.items || [];
  },

  /**
   * Obtiene los periodos disponibles con registros reales en la base de datos
   * (años, años ISO, meses, semanas ISO y días), sin periodos futuros ni vacíos.
   */
  getPeriodosDisponibles: async (
    params?: GetPeriodosDisponiblesQueryParams,
  ): Promise<PeriodosDisponiblesResponse> => {
    const query = new URLSearchParams();
    if (params?.anio !== undefined) query.set('anio', params.anio.toString());
    if (params?.anioIso !== undefined) query.set('anioIso', params.anioIso.toString());
    if (params?.mes !== undefined) query.set('mes', params.mes.toString());
    if (params?.departamentoId) query.set('departamentoId', params.departamentoId.toString());
    if (params?.departamentoAuditoriaId) {
      query.set('departamentoAuditoriaId', params.departamentoAuditoriaId.toString());
    }
    if (params?.departamentoResponsableId) {
      query.set('departamentoResponsableId', params.departamentoResponsableId.toString());
    }
    if (params?.inspectorId) query.set('inspectorId', params.inspectorId.toString());
    if (params?.lineaId) query.set('lineaId', params.lineaId.toString());
    if (params?.lineaTexto) query.set('lineaTexto', params.lineaTexto);
    if (params?.defectoClave !== undefined) {
      query.set('defectoClave', params.defectoClave.toString());
    }
    if (params?.clasificacion) query.set('clasificacion', params.clasificacion);
    if (params?.lote) query.set('lote', params.lote);
    if (params?.busqueda) query.set('busqueda', params.busqueda);
    if (params?.terminalId) query.set('terminalId', params.terminalId.toString());
    if (params?.soloEliminados !== undefined) {
      query.set('soloEliminados', String(params.soloEliminados));
    }

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await httpClient.get<ApiResponse<PeriodosDisponiblesResponse>>(
      `/inspecciones/periodos-disponibles${qs}`,
    );
    return (
      res.data || {
        anios: [],
        aniosIso: [],
        anioSeleccionado: null,
        anioIsoSeleccionado: null,
        mesSeleccionado: null,
        meses: [],
        semanas: [],
        dias: [],
        rangoTotal: {
          fechaMinima: null,
          fechaMaxima: null,
          hoy: new Date().toISOString().slice(0, 10),
        },
      }
    );
  },

  /**
   * Obtiene las métricas generales del Dashboard de Inicio para todos los usuarios.
   */
  getDashboardMetricas: async (): Promise<{
    contadoresDeptoHoy: Record<number, { pares: number; incidencias: number }>;
    topSemanal: Record<string, Array<{ clave: number; defecto: string; defectos: number }>>;
  }> => {
    const res = await httpClient.get<
      ApiResponse<{
        contadoresDeptoHoy: Record<number, { pares: number; incidencias: number }>;
        topSemanal: Record<string, Array<{ clave: number; defecto: string; defectos: number }>>;
      }>
    >('/inspecciones/dashboard-metricas');
    return res.data || { contadoresDeptoHoy: {}, topSemanal: {} };
  },

  /**
   * Consulta el listado paginado de filas de defectos de inspección.
   */
  getFilasInspeccion: async (
    params?: GetFilasInspeccionQueryParams,
  ): Promise<GetFilasInspeccionResponse> => {
    const qs = construirQueryStringInspecciones(params);
    const res = await httpClient.get<ApiResponse<GetFilasInspeccionResponse>>(
      `/inspecciones${qs}`,
    );
    return (
      res.data || {
        items: [],
        total: 0,
        totalDefectos: 0,
        totalInspecciones: 0,
        periodo: 'ultimos',
        page: 1,
        limit: 30,
        totalPages: 1,
      }
    );
  },

  /**
   * Consulta la totalidad de las filas de defectos correspondientes a los filtros
   * sin truncamiento de 500 registros (paginación interna por lotes en backend).
   */
  exportarFilasInspeccion: async (
    params?: FiltrosInspeccionesQueryParams,
  ): Promise<ExportarFilasInspeccionResponse> => {
    const qs = construirQueryStringInspecciones(params);
    const res = await httpClient.get<ApiResponse<ExportarFilasInspeccionResponse>>(
      `/inspecciones/exportar${qs}`,
    );
    return (
      res.data || {
        items: [],
        total: 0,
        totalDefectos: 0,
        totalInspecciones: 0,
        totalParesDefectuosos: 0,
        periodo: params?.periodo || 'todos',
      }
    );
  },

  /**
   * Elimina un detalle de defecto (solo permitido dentro de los últimos 30 días).
   */
  cancelarDetalleInspeccion: async (
    detalleId: number,
    payload?: { motivo?: string; codigoConfirmacion?: string },
  ): Promise<any> => {
    const res = await httpClient.post<ApiResponse<any>>(
      `/inspecciones/detalles/${detalleId}/cancelar`,
      payload || {},
    );
    return res.data;
  },

  /**
   * Recupera un detalle de defecto eliminado lógicamente.
   */
  recuperarDetalleInspeccion: async (
    detalleId: number,
    payload?: { motivo?: string },
  ): Promise<any> => {
    const res = await httpClient.post<ApiResponse<any>>(
      `/inspecciones/detalles/${detalleId}/recuperar`,
      payload || {},
    );
    return res.data;
  },
};
