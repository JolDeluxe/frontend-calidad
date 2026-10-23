export interface TipoOperacion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  lineas?: Linea[];
}

export interface Linea {
  id: number;
  tipoOperacionId: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  tipoOperacion?: TipoOperacion;
  departamentos?: Array<{
    id: number;
    departamentoId: number;
    lineaId: number;
    orden?: number;
    activo: boolean;
    departamento: {
      id: number;
      codigo: string;
      nombre: string;
      estado: 'ACTIVO' | 'INACTIVO';
    };
  }>;
}

export interface Departamento {
  id: number;
  codigo: string;
  nombre: string;
  categoriaDepartamentoId?: number | null;
  estado: 'ACTIVO' | 'INACTIVO';
  fechaCreacion?: string;
  fechaActualizacion?: string;
  categoria?: {
    id: number;
    nombre: string;
    activo: boolean;
  } | null;
  lineasAsociadas?: Array<{
    id: number;
    departamentoId: number;
    lineaId: number;
    orden?: number;
    activo: boolean;
    linea: {
      id: number;
      codigo: string;
      nombre: string;
      tipoOperacion?: {
        id: number;
        codigo: string;
        nombre: string;
      };
    };
  }>;
  defectosAsociados?: Array<{
    id: number;
    defectoId: number;
    departamentoId: number;
    activo: boolean;
  }>;
}
