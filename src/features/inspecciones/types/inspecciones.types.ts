export interface LineaOperativa {
  id: number;
  codigo: string;
  nombre: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface ProduccionLote {
  id: number;
  listaLote: string;
  lista: string;
  lote: string;
  idProducto: string;
  modelo: string;
  cantidad: number;
  descripcion: string | null;
  cliente: string;
  horma: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface DefectoItemStaging {
  idTemporal: string;
  defectoId: number;
  clave: number;
  defecto: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  departamentoResponsableId: number;
  departamentoResponsableNombre: string;
  paresDefectuosos: number;
  notas?: string;
}

export interface InspeccionFilaResponse {
  id: number;
  inspeccionId: number;
  folio: string;
  departamentoAuditoria: string;
  departamentoAuditoriaCodigo: string;
  fecha: string;
  lista: string;
  lote: string;
  linea: string;
  modelo: string;
  descripcion: string | null;
  horma: string;
  cliente: string;
  cantidadLote: number;
  defDepto: string;
  defectoId: number;
  defectoClave: number;
  defectoNombre: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  paresDefectuosos: number;
  notas: string | null;
  usuario: string;
}

export interface GetFilasInspeccionResponse {
  items: InspeccionFilaResponse[];
  total: number;
  periodo: 'hoy' | 'ultimos' | 'todos';
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateInspeccionPayload {
  lote: string;
  lineaId?: number | null;
  departamentoAuditoriaId?: number;
  horma?: string | null;
  notas?: string | null;
  detalles: Array<{
    defectoId: number;
    defDeptoId: number;
    paresDefectuosos: number;
    notas?: string;
  }>;
}
