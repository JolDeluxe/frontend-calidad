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
