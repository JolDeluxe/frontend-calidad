export interface Defecto {
  id: number;
  clave: number;
  defecto: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  departamentoId?: number;
  departamento?: {
    id: number;
    codigo: string;
    nombre: string;
  };
  etapas?: Array<{
    id: number;
    departamentoId: number;
    permitido: boolean;
    departamento?: {
      id: number;
      codigo: string;
      nombre: string;
    };
  }>;
  activo: boolean;
  creadoPor: number;
  creadoEn: string;
  actualizadoPor?: number | null;
  actualizadoEn?: string;
  eliminadoPor?: number | null;
  eliminadoEn?: string | null;
  creador?: { id: number; usuario: string; nombre: string };
  actualizador?: { id: number; usuario: string; nombre: string } | null;
  departamentos?: Array<{
    id: number;
    defectoId: number;
    departamentoId: number;
    activo: boolean;
    departamento: {
      id: number;
      codigo: string;
      nombre: string;
      estado: 'ACTIVO' | 'INACTIVO';
      lineasAsociadas?: Array<{
        id: number;
        activo: boolean;
        linea?: {
          id: number;
          codigo: string;
          nombre: string;
        };
      }>;
    };
  }>;
}

export interface GetDefectosResponse {
  items: Defecto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ClasificacionDefecto = 'CRITICO' | 'MAYOR' | 'MENOR';

export interface GrupoCodificacion {
  id: number;
  lineaId: number;
  departamentoId: number;
  prefijo: number;
  siguienteConsecutivo: number;
  activo: boolean;
  agotado: boolean;
  linea?: { id: number; codigo: string; nombre: string };
  departamento?: { id: number; codigo: string; nombre: string };
}

export interface FilaLotePayload {
  clave?: number;
  descripcion: string;
  clasificacion: string;
}

export interface LoteDefectosPayload {
  lineaId: number;
  departamentoId: number;
  filas: FilaLotePayload[];
  departamentosIds?: number[];
  etapasPermitidasIds?: number[];
}

export interface LotePreviewFila {
  indice: number;
  valida: boolean;
  errores: string[];
  clavePropuesta: number | null;
}

export interface LotePreviewResponse {
  grupo: {
    id: number;
    lineaId: number;
    departamentoId: number;
    prefijo: number;
    siguienteConsecutivo: number;
    rangoMin: number;
    rangoMax: number;
    disponibles: number;
    proximaClave: number | null;
  };
  filas: LotePreviewFila[];
  clavesOmitidas: number[];
  errores: string[];
  valido: boolean;
}

export interface LoteCreadoResponse {
  grupoId: number;
  prefijo: number;
  items: Array<{ indice: number; id: number; clave: number }>;
  clavesOmitidas: number[];
}
