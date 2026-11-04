import { httpClient } from '@/lib/api/http-client';

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
    return httpClient.get<MatrizVisibilidadResponse>('/defectos/matriz-visibilidad');
  },

  getMatrizPorDepartamento: async (departamentoOrigenId: number): Promise<MatrizDepartamentoResponse> => {
    return httpClient.get<MatrizDepartamentoResponse>(`/defectos/matriz-visibilidad/${departamentoOrigenId}`);
  },

  upsertRegla: async (data: {
    departamentoOrigenId: number;
    departamentoDestinoId: number;
    permitido: boolean;
  }): Promise<{ id: number; permitido: boolean }> => {
    return httpClient.post<{ id: number; permitido: boolean }>('/defectos/matriz-visibilidad/regla', data);
  },

  actualizarMatrizDepartamento: async (data: {
    departamentoOrigenId: number;
    destinos: Array<{ departamentoDestinoId: number; permitido: boolean }>;
  }): Promise<unknown> => {
    return httpClient.put('/defectos/matriz-visibilidad/departamento', data);
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
    return httpClient.get(`/defectos/resolver-visibilidad?defectoId=${defectoId}&departamentoDeteccionId=${departamentoDeteccionId}`);
  },
};
