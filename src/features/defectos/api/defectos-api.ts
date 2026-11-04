import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type {
  Defecto,
  GetDefectosResponse,
  GrupoCodificacion,
  LoteCreadoResponse,
  LoteDefectosPayload,
  LotePreviewResponse,
} from '../types/defectos.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export interface ValidacionDefectoCaptura {
  estado: 'VALIDO' | 'INEXISTENTE' | 'INACTIVO' | 'NO_PERMITIDO';
  mensaje: string;
  defecto: Defecto | null;
}

export const defectosApi = {
  validarCaptura: async (clave: number, etapaId: number): Promise<ValidacionDefectoCaptura> => {
    const res = await httpClient.get<ApiResponse<ValidacionDefectoCaptura>>(
      `/defectos/validar-captura?clave=${clave}&etapaId=${etapaId}`,
    );
    return res.data!;
  },

  getDefectos: async (params?: {
    clave?: number;
    texto?: string;
    busqueda?: string;
    clasificacion?: string;
    departamentoId?: number;
    etapaId?: number;
    categoriaDepartamentoId?: number;
    lineaId?: number;
    lineasIds?: number[];
    activo?: boolean;
    incluirEliminados?: boolean;
    soloEliminados?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.clave !== undefined) query.set('clave', params.clave.toString());
    if (params?.texto) query.set('texto', params.texto);
    if (params?.busqueda) query.set('busqueda', params.busqueda);
    if (params?.clasificacion) query.set('clasificacion', params.clasificacion);
    if (params?.departamentoId) query.set('departamentoId', params.departamentoId.toString());
    if (params?.etapaId) query.set('etapaId', params.etapaId.toString());
    if (params?.categoriaDepartamentoId) query.set('categoriaDepartamentoId', params.categoriaDepartamentoId.toString());
    if (params?.lineaId) query.set('lineaId', params.lineaId.toString());
    if (params?.lineasIds && params.lineasIds.length > 0) query.set('lineasIds', params.lineasIds.join(','));
    if (params?.activo !== undefined) query.set('activo', params.activo.toString());
    if (params?.incluirEliminados) query.set('incluirEliminados', 'true');
    if (params?.soloEliminados) query.set('soloEliminados', 'true');
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await httpClient.get<ApiResponse<GetDefectosResponse>>(`/defectos${qs}`);
    return res.data || { items: [], total: 0, page: 1, limit: 15, totalPages: 1 };
  },

  getDefectoById: async (id: number) => {
    const res = await httpClient.get<ApiResponse<Defecto>>(`/defectos/${id}`);
    return res.data!;
  },

  createDefecto: async (data: {
    defecto: string;
    clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
    departamentoId?: number;
    lineaId?: number;
    departamentosIds?: number[];
  }) => {
    const res = await httpClient.post<ApiResponse<Defecto>>('/defectos', data);
    return res.data!;
  },

  getGruposCodificacion: async (lineaId?: number) => {
    const qs = lineaId ? `?lineaId=${lineaId}` : '';
    const res = await httpClient.get<ApiResponse<GrupoCodificacion[]>>(`/defectos/grupos-codificacion${qs}`);
    return res.data || [];
  },

  previsualizarLote: async (data: LoteDefectosPayload) => {
    const res = await httpClient.post<ApiResponse<LotePreviewResponse>>('/defectos/batch/preview', data);
    return res.data!;
  },

  crearLote: async (data: LoteDefectosPayload) => {
    const res = await httpClient.post<ApiResponse<LoteCreadoResponse>>('/defectos/batch', data);
    return res.data!;
  },

  updateDefecto: async (id: number, data: { defecto?: string; clasificacion?: 'CRITICO' | 'MAYOR' | 'MENOR'; departamentoId?: number }) => {
    const res = await httpClient.patch<ApiResponse<Defecto>>(`/defectos/${id}`, data);
    return res.data!;
  },

  updateClaveDefecto: async (id: number, data: { nuevaClave: number }) => {
    const res = await httpClient.patch<ApiResponse<Defecto>>(`/defectos/${id}/clave`, data);
    return res.data!;
  },

  updateEstadoDefecto: async (id: number, activo: boolean) => {
    const res = await httpClient.patch<ApiResponse<Defecto>>(`/defectos/${id}/estado`, { activo });
    return res.data!;
  },

  deleteDefecto: async (id: number) => {
    const res = await httpClient.delete<ApiResponse<{ id: number; eliminado: boolean }>>(`/defectos/${id}`);
    return res.data!;
  },

  reactivarDefecto: async (id: number) => {
    const res = await httpClient.post<ApiResponse<{ id: number; reactivado: boolean }>>(`/defectos/${id}/reactivar`, {});
    return res.data!;
  },

  syncDefectoDepartamentos: async (
    defectoId: number,
    departamentos: Array<{ departamentoId: number; activo: boolean }>
  ) => {
    const res = await httpClient.put<ApiResponse<unknown[]>>(`/defectos/${defectoId}/departamentos`, { departamentos });
    return res.data || [];
  },

  syncDefectoEtapas: async (
    defectoId: number,
    etapas: Array<{ departamentoId: number; permitido: boolean }>
  ) => {
    const res = await httpClient.put<ApiResponse<unknown[]>>(`/defectos/${defectoId}/etapas`, { etapas });
    return res.data || [];
  },

  toggleDefectoDepartamento: async (defectoId: number, departamentoId: number, activo: boolean) => {
    const res = await httpClient.patch<ApiResponse<unknown>>(`/defectos/${defectoId}/departamentos/${departamentoId}`, { activo });
    return res.data;
  },

  // Consulta de departamentos para filtros y asignación en defectos (solo activos)
  getDepartamentosParaDefectos: async () => {
    const res = await httpClient.get<ApiResponse<Departamento[]>>('/departamentos?estado=ACTIVO');
    return res.data || [];
  },

  // Conteos reactivos por línea de producción y total
  getConteosLineas: async () => {
    const res = await httpClient.get<
      ApiResponse<{
        lineas: Array<{ id: number; nombre: string; total: number }>;
        todas: number;
      }>
    >('/defectos/conteos-lineas');
    return res.data || { lineas: [], todas: 0 };
  },
};
