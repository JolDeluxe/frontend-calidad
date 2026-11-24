import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type {
  ProduccionLote,
  CreateInspeccionPayload,
  GetFilasInspeccionResponse,
  ExportarFilasInspeccionResponse,
  ProgresoExportacion,
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
  if (params.departamentosIds && params.departamentosIds.length > 0) {
    query.set('departamentosIds', params.departamentosIds.join(','));
  }
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

export interface DashboardMetricasQueryParams {
  periodo?: 'hoy' | 'dia' | 'semana' | 'mes' | 'anio' | 'rango';
  dia?: string;
  semana?: number;
  anioIso?: number;
  mes?: number;
  anio?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ContadorDeptoMetrica {
  departamentoId: number;
  departamentoNombre: string;
  pares: number;
  incidencias: number;
}

export interface TopDefectoDashboardItem {
  clave: number;
  defecto: string;
  defectos: number;
  pares?: number;
  departamentoId?: number;
  departamentoNombre?: string;
}

export interface RutaCruzadaDashboardItem {
  origenId: number;
  origenNombre: string;
  detectorId: number;
  detectorNombre: string;
  defectos: number;
  pares: number;
}

export interface DefectoCruzadoDashboardItem {
  clave: number;
  defecto: string;
  origenId: number;
  origenNombre: string;
  detectorId: number;
  detectorNombre: string;
  defectos: number;
  pares: number;
}

export interface DashboardMetricasResponse {
  periodo?: string;
  rango?: { inicioUtc: string; finUtc: string };
  contadoresDepto?: ContadorDeptoMetrica[];
  contadoresDeptoHoy: Record<number, { pares: number; incidencias: number }>;
  rutasCruzadas?: RutaCruzadaDashboardItem[];
  defectosCruzados?: DefectoCruzadoDashboardItem[];
  totalDefectosCruzados?: number;
  totalParesCruzados?: number;
  totalTiposCruzados?: number;
  topSemanal: Record<string, TopDefectoDashboardItem[]>;
}

export const inspeccionesApi = {
  /**
   * Obtiene la información oficial de un lote maestro por su número y opcionalmente lista.
   */
  getLoteByCodigo: async (codigoLote: string, lista?: string): Promise<ProduccionLote> => {
    const res = await httpClient.get<ApiResponse<ProduccionLote>>(
      `/lotes/${encodeURIComponent(codigoLote.trim())}`,
      lista ? { params: { lista: lista.trim() } } : undefined,
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
    if (params?.departamentosIds && params.departamentosIds.length > 0) {
      query.set('departamentosIds', params.departamentosIds.join(','));
    }
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
   * Soporta filtros temporales (hoy, dia, semana, mes, anio), por defecto semana.
   */
  getDashboardMetricas: async (
    params?: DashboardMetricasQueryParams,
  ): Promise<DashboardMetricasResponse> => {
    const query = new URLSearchParams();
    if (params?.periodo) query.set('periodo', params.periodo);
    if (params?.dia) query.set('dia', params.dia);
    if (params?.semana !== undefined) query.set('semana', params.semana.toString());
    if (params?.anioIso !== undefined) query.set('anioIso', params.anioIso.toString());
    if (params?.mes !== undefined) query.set('mes', params.mes.toString());
    if (params?.anio !== undefined) query.set('anio', params.anio.toString());
    if (params?.fechaDesde) query.set('fechaDesde', params.fechaDesde);
    if (params?.fechaHasta) query.set('fechaHasta', params.fechaHasta);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await httpClient.get<ApiResponse<DashboardMetricasResponse>>(
      `/inspecciones/dashboard-metricas${qs}`,
    );
    return (
      res.data || {
        contadoresDepto: [],
        contadoresDeptoHoy: {},
        topSemanal: {},
      }
    );
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
   * Consulta la totalidad de las filas de defectos mediante descargas paginadas secuenciales seguras,
   * informando el progreso en tiempo real y evitando saturación de memoria en API y navegador.
   */
  exportarFilasInspeccionPaginado: async (
    params?: FiltrosInspeccionesQueryParams,
    onProgreso?: (progreso: ProgresoExportacion) => void,
    chunkLimit = 2500,
    signal?: AbortSignal,
  ): Promise<ExportarFilasInspeccionResponse> => {
    const primeraPaginaParams = { ...params, page: 1, limit: chunkLimit };
    const qs1 = construirQueryStringInspecciones(primeraPaginaParams);
    const res1 = await httpClient.get<ApiResponse<ExportarFilasInspeccionResponse>>(
      `/inspecciones/exportar${qs1}`,
      { signal },
    );

    const data1 = res1.data;
    if (!data1) {
      return {
        items: [],
        total: 0,
        totalDefectos: 0,
        totalInspecciones: 0,
        totalParesDefectuosos: 0,
        periodo: params?.periodo || 'todos',
      };
    }

    const totalDefectos = data1.totalDefectos ?? data1.total ?? data1.items.length;
    const totalPaginas =
      data1.totalPages ?? (totalDefectos > 0 ? Math.ceil(totalDefectos / chunkLimit) : 1);
    let acumulados = [...(data1.items || [])];

    onProgreso?.({
      cargados: acumulados.length,
      total: totalDefectos,
      porcentaje:
        totalDefectos > 0
          ? Math.min(100, Math.round((acumulados.length / totalDefectos) * 100))
          : 100,
      paginaActual: 1,
      totalPaginas,
    });

    if (totalPaginas > 1) {
      for (let p = 2; p <= totalPaginas; p++) {
        if (signal?.aborted) {
          throw new Error('Exportación cancelada por el usuario');
        }
        const pagParams = { ...params, page: p, limit: chunkLimit };
        const qsP = construirQueryStringInspecciones(pagParams);
        const resP = await httpClient.get<ApiResponse<ExportarFilasInspeccionResponse>>(
          `/inspecciones/exportar${qsP}`,
          { signal },
        );
        const itemsP = resP.data?.items || [];
        acumulados = acumulados.concat(itemsP);

        onProgreso?.({
          cargados: acumulados.length,
          total: totalDefectos,
          porcentaje:
            totalDefectos > 0
              ? Math.min(100, Math.round((acumulados.length / totalDefectos) * 100))
              : 100,
          paginaActual: p,
          totalPaginas,
        });
      }
    }

    const inspeccionesUnicas = new Set(acumulados.map((i) => i.inspeccionId)).size;
    const totalPares = acumulados.reduce(
      (acc, i) => acc + (Number(i.paresDefectuosos) || 0),
      0,
    );

    return {
      items: acumulados,
      total: acumulados.length,
      totalDefectos: acumulados.length,
      totalInspecciones: inspeccionesUnicas,
      totalParesDefectuosos: totalPares,
      periodo: data1.periodo,
      page: 1,
      limit: chunkLimit,
      totalPages: totalPaginas,
    };
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
