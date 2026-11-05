import { httpClient, type ApiResponse } from '@/lib/api/http-client';

export interface DestinoMatrizVisibilidad {
  departamentoDestinoId: number;
  departamentoDestinoCodigo: string;
  departamentoDestinoNombre: string;
  permitido: boolean;
  configurado: boolean;
  reglaId: number | null;
  fechaActualizacion: string | null;
  actualizadoPor: number | null;
}

export interface OrigenMatrizVisibilidad {
  departamentoOrigenId: number;
  departamentoOrigenCodigo: string;
  departamentoOrigenNombre: string;
  totalDefectosAfectados: number;
  estaConfigurado: boolean;
  configuradasCount: number;
  totalDestinos: number;
  destinos: DestinoMatrizVisibilidad[];
}

export interface MatrizVisibilidadResponse {
  departamentos: Array<{
    id: number;
    codigo: string;
    nombre: string;
    numeroLineas: number;
  }>;
  matrices: OrigenMatrizVisibilidad[];
}

export interface MatrizDepartamentoResponse {
  departamentoOrigen: {
    id: number;
    codigo: string;
    nombre: string;
  };
  totalDefectosAfectados: number;
  destinos: DestinoMatrizVisibilidad[];
}

export const matrizVisibilidadApi = {
  getMatrizCompleta: async (): Promise<MatrizVisibilidadResponse> => {
    const res = await httpClient.get<ApiResponse<MatrizVisibilidadResponse>>('/defectos/matriz-visibilidad');
    return (res.data ?? res) as MatrizVisibilidadResponse;
  },

  getMatrizPorDepartamento: async (departamentoOrigenId: number): Promise<MatrizDepartamentoResponse> => {
    const res = await httpClient.get<ApiResponse<MatrizDepartamentoResponse>>(`/defectos/matriz-visibilidad/${departamentoOrigenId}`);
    return (res.data ?? res) as MatrizDepartamentoResponse;
  },

  upsertRegla: async (data: {
    departamentoOrigenId: number;
    departamentoDestinoId: number;
    permitido: boolean;
  }): Promise<{ id: number; permitido: boolean }> => {
    const res = await httpClient.post<ApiResponse<{ id: number; permitido: boolean }>>('/defectos/matriz-visibilidad/regla', data);
    return (res.data ?? res) as { id: number; permitido: boolean };
  },

  actualizarMatrizDepartamento: async (data: {
    departamentoOrigenId: number;
    destinos: Array<{ departamentoDestinoId: number; permitido: boolean }>;
  }): Promise<unknown> => {
    const res = await httpClient.put<ApiResponse<unknown>>('/defectos/matriz-visibilidad/departamento', data);
    return res.data ?? res;
  },

  resolverVisibilidad: async (
    defectoId: number,
    departamentoDeteccionId: number
  ): Promise<{
    permitido: boolean;
    origenRegla: 'EXCEPCION' | 'MATRIZ' | 'DEFAULT_COMPATIBILIDAD';
    departamentoPropietarioId: number;
    departamentoDeteccionId: number;
    defectoId?: number;
  }> => {
    const res = await httpClient.get<ApiResponse<{
      permitido: boolean;
      origenRegla: 'EXCEPCION' | 'MATRIZ' | 'DEFAULT_COMPATIBILIDAD';
      departamentoPropietarioId: number;
      departamentoDeteccionId: number;
      defectoId?: number;
    }>>(`/defectos/resolver-visibilidad?defectoId=${defectoId}&departamentoDeteccionId=${departamentoDeteccionId}`);
    return (res.data ?? res) as {
      permitido: boolean;
      origenRegla: 'EXCEPCION' | 'MATRIZ' | 'DEFAULT_COMPATIBILIDAD';
      departamentoPropietarioId: number;
      departamentoDeteccionId: number;
      defectoId?: number;
    };
  },
};
